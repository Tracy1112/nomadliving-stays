/**
 * Next.js Instrumentation Hook
 *
 * This file is used to initialize Sentry and other monitoring tools
 * when the Next.js server starts.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register() {
  // Only run on server
  if (typeof window === 'undefined') {
    // Initialize Sentry if DSN is provided and Sentry is installed
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // Try to require Sentry (only works if installed)
        if (typeof require !== 'undefined') {
          require('@sentry/nextjs');
          // Sentry is initialized in sentry.server.config.ts
          // This file ensures the instrumentation hook is registered
        }
      } catch (error) {
        // Sentry not installed, silently fail
        // This is expected if Sentry is not installed
      }
    }
  }
}

