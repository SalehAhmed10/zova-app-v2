import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { Text } from './text';
import { cn } from '@/lib/utils';

const selectVariants = cva(
  'flex-row items-center justify-between rounded-lg border px-3 py-2.5 min-h-[44px]',
  {
    variants: {
      variant: {
        default: 'border-border bg-background',
        error: 'border-destructive bg-background',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

interface SelectProps extends VariantProps<typeof selectVariants> {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  option: SelectOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
  className?: string;
}

const SelectItem = ({ option, isSelected, onSelect, className }: SelectItemProps) => (
  <Pressable
    onPress={() => onSelect(option.value)}
    className={cn(
      'p-4 border-b border-border/50 active:bg-muted',
      isSelected && 'bg-primary/10',
      className
    )}
  >
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <Text className={cn('font-medium', isSelected && 'text-primary')}>
          {option.label}
        </Text>
        {option.description && (
          <Text className="text-sm text-muted-foreground mt-1">
            {option.description}
          </Text>
        )}
      </View>
      {isSelected && (
        <Text className="text-primary font-bold ml-2">✓</Text>
      )}
    </View>
  </Pressable>
);

const SelectContent = ({ children, className }: SelectContentProps) => (
  <View className={cn('bg-background border border-border rounded-lg overflow-hidden', className)}>
    {children}
  </View>
);

const Select = React.forwardRef<View, SelectProps>(
  ({ options, value, onValueChange, placeholder = 'Select an option', variant, className, disabled, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const selectedOption = options.find(option => option.value === value);
    
    const handleSelect = (optionValue: string) => {
      onValueChange?.(optionValue);
      setIsOpen(false);
    };

    return (
      <View ref={ref} {...props}>
        <Pressable
          onPress={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            selectVariants({ variant }),
            disabled && 'opacity-50',
            className
          )}
        >
          <Text className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <Text 
            className="text-muted-foreground"
            style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
          >
            ▼
          </Text>
        </Pressable>
        
        {isOpen && (
          <View className="mt-2">
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  option={option}
                  isSelected={value === option.value}
                  onSelect={handleSelect}
                />
              ))}
            </SelectContent>
          </View>
        )}
      </View>
    );
  }
);

Select.displayName = 'Select';

export { Select, SelectContent, SelectItem, type SelectProps };