import React from 'react';

export default function LoadingSkeleton({ className = '', style = {}, rounded = 'md' }) {
  return (
    <div
      className={`relative overflow-hidden bg-light-skeleton dark:bg-skeleton animate-pulse ${className} rounded-${rounded}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-300 dark:via-[#2a2d31] to-transparent animate-shimmer" />
    </div>
  );
}
