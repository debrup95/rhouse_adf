import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

interface AnalyticsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  analyticsName: string;
  children: React.ReactNode;
  className?: string;
}

export const AnalyticsButton: React.FC<AnalyticsButtonProps> = ({
  analyticsName,
  children,
  className,
  onClick,
  ...props
}) => {
  const { trackButtonClick } = useAnalytics();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trackButtonClick(analyticsName);
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}; 