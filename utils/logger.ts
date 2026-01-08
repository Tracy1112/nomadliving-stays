/**
 * Structured Logging Utility
 *
 * Provides structured logging with different log levels and optional Sentry integration.
 * Supports both development (console) and production (Sentry) logging.
 *
 * Note: Sentry integration is configured separately in sentry.*.config.ts files.
 * This logger provides structured logging that works with or without Sentry.
 *
 * @module utils/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

/**
 * Structured logger class for consistent logging across the application
 */
class Logger {
  // Check environment on each call to support test environment changes
  private get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
  
  private get sentryEnabled(): boolean {
    return !!(process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production');
  }

  /**
   * Logs a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Logs an info message
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '');
    }
    // In production, Sentry automatically captures console.info as breadcrumbs
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');
    // In production, Sentry automatically captures console.warn as breadcrumbs
  }

  /**
   * Logs an error message with optional Sentry integration
   * Note: Sentry automatically captures console.error, so we just log to console
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error && {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      }),
    };

    console.error(`[ERROR] ${message}`, errorContext);
    
    // Sentry automatically captures console.error when configured
    // Additional Sentry integration can be added in sentry.*.config.ts files
  }

  /**
   * Logs a performance metric
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const message = `[PERF] ${operation} took ${duration}ms`;
    
    if (this.isDevelopment) {
      console.log(message, context || '');
    }
    // In production, performance metrics can be sent to Sentry as breadcrumbs
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Convenience functions for common logging scenarios
 */
export const logError = (message: string, error?: Error | unknown, context?: LogContext) => {
  logger.error(message, error, context);
};

export const logInfo = (message: string, context?: LogContext) => {
  logger.info(message, context);
};

export const logWarn = (message: string, context?: LogContext) => {
  logger.warn(message, context);
};

export const logDebug = (message: string, context?: LogContext) => {
  logger.debug(message, context);
};

export const logPerformance = (operation: string, duration: number, context?: LogContext) => {
  logger.performance(operation, duration, context);
};
