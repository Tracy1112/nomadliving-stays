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
    // 在生产环境中，这里可以发送错误到错误监控服务（如Sentry）
    console.error('Error caught by boundary:', error, errorInfo);
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
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h2 className="text-2xl font-bold text-destructive">
            出现了一些问题
          </h2>
          <p className="text-muted-foreground">
            {this.state.error?.message || '发生了意外错误'}
          </p>
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="outline">
              重试
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="default">
              返回首页
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

