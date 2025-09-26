import { cn } from '@/lib/core/utils';
import * as React from 'react';
import { View as RNView, type ViewProps } from 'react-native';

const View = React.forwardRef<RNView, ViewProps>(
  ({ className, ...props }, ref) => {
    return (
      <RNView
        ref={ref}
        className={cn('bg-background transition-colors', className)}
        {...props}
      />
    );
  }
);

View.displayName = 'View';

export { View };