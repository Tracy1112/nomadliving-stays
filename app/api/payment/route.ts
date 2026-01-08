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
import { rateLimit, getClientIP, RATE_LIMITS } from '@/utils/rate-limit';

// Force dynamic rendering (this route uses request headers for rate limiting)
export const dynamic = 'force-dynamic';

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
    // Rate limiting for payment endpoint
    const clientIP = getClientIP(req);
    const rateLimitResult = rateLimit(clientIP, {
      ...RATE_LIMITS.PAYMENT,
      identifier: 'payment',
    });

    if (!rateLimitResult.success) {
      return Response.json(
        {
          error: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

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

    const response = Response.json({ clientSecret: session.client_secret });
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
    
    return response;
  } catch (error) {
    return handleApiError(error, 'Failed to process payment');
  }
};
