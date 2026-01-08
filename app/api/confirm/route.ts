import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import db from '@/utils/db';
import {
  PaymentError,
  ExternalServiceError,
  NotFoundError,
  DatabaseError,
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

export const GET = async (req: NextRequest) => {
  try {
    // Rate limiting for confirm endpoint
    const clientIP = getClientIP(req);
    const rateLimitResult = rateLimit(clientIP, {
      ...RATE_LIMITS.PAYMENT,
      identifier: 'confirm',
    });

    if (!rateLimitResult.success) {
      redirect(`/bookings?error=rate_limit&retry_after=${rateLimitResult.retryAfter}`);
      return;
    }

    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) {
      throw new PaymentError('Session ID is required');
    }

    // 在函数内部获取 Stripe 客户端，避免构建时错误
    const stripe = getStripeClient();

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch (error) {
      throw new ExternalServiceError(
        'Stripe',
        'Failed to retrieve checkout session',
        { error, session_id }
      );
    }

    const bookingId = session.metadata?.bookingId;
    
    if (!bookingId) {
      throw new PaymentError('Booking ID not found in session metadata');
    }

    if (session.status !== 'complete') {
      throw new PaymentError(`Payment not completed. Status: ${session.status}`);
    }

    // 验证预订存在
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, paymentStatus: true },
    });
    const existingBooking = ensureExists(booking, 'Booking');

    // 防止重复支付
    if (existingBooking.paymentStatus) {
      // 已支付，直接重定向
      redirect('/bookings');
      return;
    }

    // 更新支付状态
    try {
      await db.booking.update({
        where: { id: existingBooking.id },
        data: { paymentStatus: true },
      });
    } catch (error) {
      throw new DatabaseError('Failed to update booking payment status', {
        error,
        bookingId: existingBooking.id,
      });
    }

    redirect('/bookings');
  } catch (error) {
    // 对于支付确认错误，重定向到错误页面或显示错误
    console.error('Payment confirmation error:', error);
    // 可以重定向到错误页面
    redirect('/bookings?error=payment_failed');
  }
};
