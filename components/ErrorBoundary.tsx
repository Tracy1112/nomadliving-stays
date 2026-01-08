'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with structured logging (includes Sentry integration if enabled)
    if (typeof window !== 'undefined') {
      // Dynamic import to avoid SSR issues
      import('@/utils/logger').then(({ logger }) => {
        logger.error('Error caught by ErrorBoundary', error, {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        });
      }).catch(() => {
        // Fallback to console if logger not available
        console.error('Error caught by boundary:', error, errorInfo);
      });
    } else {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-destructive">
              Something went wrong
            </h2>
            <p className="text-muted-foreground max-w-md">
              {this.state.error?.message || 'An unexpected error occurred. Our team has been notified.'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={this.handleReset} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="default">
              Back to NomadLiving Stays
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

