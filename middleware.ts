import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/', '/properties(.*)']);
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

// 环境变量验证
const adminUserId = process.env.ADMIN_USER_ID;
if (!adminUserId && process.env.NODE_ENV === 'production') {
  console.error('⚠️  WARNING: ADMIN_USER_ID is not set in production environment');
}

export default clerkMiddleware((auth, req) => {
  const userId = auth().userId;
  const isAdminUser = userId === adminUserId;
  
  if (isAdminRoute(req) && !isAdminUser) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  if (!isPublicRoute(req)) auth().protect();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
