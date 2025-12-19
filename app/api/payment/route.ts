import Stripe from 'stripe';
import { type NextRequest } from 'next/server';
import db from '@/utils/db';
import { formatDate } from '@/utils/format';
import {
  NotFoundError,
  PaymentError,
  ExternalServiceError,
  handleApiError,
  ensureExists,
} from '@/utils/errors';

// 延迟创建 Stripe 客户端，只在需要时检查环境变量
function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(stripeSecretKey);
}

export const POST = async (req: NextRequest) => {
  try {
    const requestHeaders = new Headers(req.headers);
    const origin = requestHeaders.get('origin');
    
    if (!origin) {
      return handleApiError(new Error('Origin header is required'));
    }

    const { bookingId } = await req.json();

    if (!bookingId) {
      return handleApiError(new Error('Booking ID is required'));
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    const existingBooking = ensureExists(booking, 'Booking');

    // 检查预订是否已支付
    if (existingBooking.paymentStatus) {
      return handleApiError(
        new PaymentError('This booking has already been paid')
      );
    }

    const {
      totalNights,
      orderTotal,
      checkIn,
      checkOut,
      property: { image, name },
    } = existingBooking;

    // 验证订单总额
    if (orderTotal <= 0) {
      return handleApiError(new PaymentError('Invalid order total'));
    }

    // 在函数内部获取 Stripe 客户端，避免构建时错误
    const stripe = getStripeClient();

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        metadata: { bookingId: existingBooking.id },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${name}`,
                images: [image],
                description: `Stay in this wonderful place for ${totalNights} nights, from ${formatDate(
                  checkIn
                )} to ${formatDate(checkOut)}. Enjoy your stay!`,
              },
              unit_amount: orderTotal * 100,
            },
          },
        ],
        mode: 'payment',
        return_url: `${origin}/api/confirm?session_id={CHECKOUT_SESSION_ID}`,
      });
    } catch (error) {
      throw new ExternalServiceError(
        'Stripe',
        'Failed to create checkout session',
        { error, bookingId }
      );
    }

    if (!session.client_secret) {
      throw new PaymentError('Failed to get payment client secret');
    }

    return Response.json({ clientSecret: session.client_secret });
  } catch (error) {
    return handleApiError(error, 'Failed to process payment');
  }
};
