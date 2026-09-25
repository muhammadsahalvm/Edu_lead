import React from 'react';

export const LoadingSkeleton = ({ className = '', variant = 'text', count = 1 }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'card':
        return 'rounded-xl h-28 w-full';
      case 'chart':
        return 'rounded-xl h-64 w-full';
      case 'table-row':
        return 'h-10 w-full rounded';
      case 'metric':
        return 'h-24 w-full rounded-xl';
      default:
        return 'h-4 w-full rounded';
    }
  };

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((key) => (
        <div
          key={key}
          className={`skeleton-shimmer bg-slate-200/70 animate-pulse ${getVariantClass()} ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
};
