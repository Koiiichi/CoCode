// CoCode Button Component

import React from 'react';
import { cn } from '@/lib/utils';
import { Icon, type IconProps } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconProps['name'];
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children?: React.ReactNode;
}

const variants = {
  primary: 'bg-accent hover:bg-accent-weak text-white border-transparent',
  secondary: 'bg-bg-1 hover:bg-bg-2 text-fg border-border',
  ghost: 'bg-transparent hover:bg-bg-1 text-fg border-transparent',
  danger: 'bg-danger hover:bg-red-600 text-white border-transparent',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const hasText = Boolean(children);
  const iconOnly = icon && !hasText;
  
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium',
        'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Variants
        variants[variant],
        
        // Sizes
        iconOnly ? 'aspect-square' : sizes[size],
        iconOnly && size === 'sm' && 'w-8',
        iconOnly && size === 'md' && 'w-10',
        iconOnly && size === 'lg' && 'w-12',
        
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent w-4 h-4" />
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} />
      )}
      
      {!loading && children}
      
      {!loading && icon && iconPosition === 'right' && (
        <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} />
      )}
    </button>
  );
}
