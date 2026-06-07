import React from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  action,
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center py-16 gap-4 text-center', className)}>
    <div className="text-5xl animate-float">{icon}</div>
    <div>
      <h3 className="text-lg font-semibold text-dark-200">{title}</h3>
      {description && <p className="text-dark-400 mt-1 text-sm max-w-sm">{description}</p>}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Please try again.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
    <div className="text-5xl">⚠️</div>
    <div>
      <h3 className="text-lg font-semibold text-red-400">{title}</h3>
      <p className="text-dark-400 mt-1 text-sm">{message}</p>
    </div>
    {onRetry && (
      <button onClick={onRetry} className="btn-secondary text-sm">
        Try Again
      </button>
    )}
  </div>
);
