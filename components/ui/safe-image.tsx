'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LuImageOff } from 'react-icons/lu';

interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  fallbackIcon?: React.ReactNode;
}

/**
 * SafeImage component with error handling and fallback
 * Prevents 400/502 errors when images fail to load or when Supabase is paused
 * Falls back to native img tag if Next.js Image optimization fails
 */
export default function SafeImage({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes,
  className = '',
  priority = false,
  fallbackIcon,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [useNativeImg, setUseNativeImg] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Default fallback icon
  const defaultFallback = (
    <div className='flex items-center justify-center bg-muted text-muted-foreground'>
      <LuImageOff className='w-8 h-8' />
    </div>
  );

  const fallback = fallbackIcon || defaultFallback;

  // Check if we should use unoptimized mode
  // For Supabase URLs, use unoptimized to avoid 400 errors when project is paused
  // Next.js Image optimizer tries to fetch the image server-side, which fails with 400
  // when Supabase is paused. Using unoptimized bypasses the optimizer.
  const isSupabaseUrl = src.includes('supabase.co');
  const shouldUnoptimize = 
    src.startsWith('data:') || 
    src.startsWith('blob:') ||
    isSupabaseUrl; // Always unoptimize Supabase URLs to prevent 400 errors

  // Handle image load error
  const handleError = () => {
    if (!useNativeImg) {
      // First error: try native img tag
      setUseNativeImg(true);
      setHasError(false);
      setIsLoading(true);
    } else {
      // Second error: show fallback
      setHasError(true);
      setIsLoading(false);
    }
  };

  // Handle image load success
  const handleLoad = () => {
    setIsLoading(false);
  };

  // If final error, show fallback
  if (hasError && useNativeImg) {
    if (fill) {
      return (
        <div className={`absolute inset-0 ${className}`}>
          {fallback}
        </div>
      );
    }
    return (
      <div
        className={className}
        style={{ width, height }}
      >
        {fallback}
      </div>
    );
  }

  // Use native img tag if Next.js Image failed
  if (useNativeImg) {
    const imgStyle = fill
      ? { objectFit: 'cover' as const, width: '100%', height: '100%' }
      : { width, height };

    return (
      <>
        {isLoading && (
          <div
            className={fill ? 'absolute inset-0 bg-muted animate-pulse' : 'bg-muted animate-pulse'}
            style={fill ? undefined : { width, height }}
          />
        )}
        <img
          src={src}
          alt={alt}
          className={className}
          style={imgStyle}
          onError={handleError}
          onLoad={handleLoad}
        />
      </>
    );
  }

  // Use Next.js Image component
  try {
    if (fill) {
      return (
        <>
          {isLoading && (
            <div className='absolute inset-0 bg-muted animate-pulse' />
          )}
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className={className}
            priority={priority}
            onError={handleError}
            onLoad={handleLoad}
            unoptimized={shouldUnoptimize}
          />
        </>
      );
    }

    return (
      <>
        {isLoading && (
          <div
            className='bg-muted animate-pulse'
            style={{ width, height }}
          />
        )}
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          priority={priority}
          onError={handleError}
          onLoad={handleLoad}
          unoptimized={shouldUnoptimize}
        />
      </>
    );
  } catch (error) {
    // If Image component fails, try native img
    console.error('Image component error:', error);
    setUseNativeImg(true);
    setHasError(false);
    setIsLoading(true);
    
    const imgStyle = fill
      ? { objectFit: 'cover' as const, width: '100%', height: '100%' }
      : { width, height };

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={imgStyle}
        onError={handleError}
        onLoad={handleLoad}
      />
    );
  }
}

