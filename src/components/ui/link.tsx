import { cn } from '@/lib/core/utils';
import { Link as ExpoLink, type LinkProps } from 'expo-router';
import * as React from 'react';
import { Text } from './text';

interface StyledLinkProps extends LinkProps {
  variant?: 'default' | 'muted' | 'primary';
  className?: string;
  children: React.ReactNode;
}

const Link = React.forwardRef<any, StyledLinkProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantStyles = {
      default: 'text-foreground hover:text-primary',
      muted: 'text-muted-foreground hover:text-foreground',
      primary: 'text-primary hover:text-primary/80',
    };

    return (
      <ExpoLink
        ref={ref}
        className={cn(
          'transition-colors hover:underline web:underline-offset-4',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className="text-inherit">{children}</Text>
        ) : (
          children
        )}
      </ExpoLink>
    );
  }
);

Link.displayName = 'Link';

export { Link };