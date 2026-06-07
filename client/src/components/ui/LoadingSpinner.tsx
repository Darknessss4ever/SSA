import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className, text }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-2 border-dark-700 border-t-primary-500 animate-spin',
          sizes[size]
        )}
      />
      {text && <p className="text-dark-400 text-sm">{text}</p>}
    </div>
  );
};

export const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark-950">
    <div className="flex flex-col items-center gap-4">
      <div className="text-4xl animate-float">🏆</div>
      <LoadingSpinner size="lg" text="Loading ShreeHari Sports Arena..." />
    </div>
  </div>
);

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('skeleton', className)} />
);
