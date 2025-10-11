import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/shared/useDebounce';

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onDebouncedChange?: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  isLoading?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Debounced search input with clear button
 * 
 * Features:
 * - 300ms debounce (configurable)
 * - Clear button when text present
 * - Loading indicator
 * - Auto-focus support
 * - Accessible placeholder
 * 
 * @example
 * ```tsx
 * <SearchInput
 *   value={query}
 *   onChangeText={setQuery}
 *   onDebouncedChange={handleSearch}
 *   placeholder="Search services..."
 *   isLoading={isSearching}
 * />
 * ```
 */
export function SearchInput({
  value,
  onChangeText,
  onDebouncedChange,
  placeholder = 'Search services...',
  debounceMs = 300,
  isLoading = false,
  autoFocus = false,
  className,
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  
  // Debounced value for API calls
  const debouncedValue = useDebounce(value, debounceMs);

  // Notify parent when debounced value changes
  React.useEffect(() => {
    if (onDebouncedChange && debouncedValue) {
      onDebouncedChange(debouncedValue);
    }
  }, [debouncedValue, onDebouncedChange]);

  const handleClear = () => {
    onChangeText('');
    if (onDebouncedChange) {
      onDebouncedChange('');
    }
  };

  return (
    <View
      className={cn(
        'flex-row items-center bg-card border rounded-xl px-4 h-12',
        isFocused ? 'border-primary' : 'border-border',
        className
      )}
    >
      {/* Search Icon */}
      <Icon
        as={Search}
        size={20}
        className={cn(
          'mr-3',
          isFocused ? 'text-primary' : 'text-muted-foreground'
        )}
      />

      {/* Input Field */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        className="flex-1 text-foreground text-base"
      />

      {/* Loading Indicator or Clear Button */}
      {isLoading ? (
        <ActivityIndicator size="small" className="text-primary ml-2" />
      ) : value.length > 0 ? (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="ml-2"
        >
          <Icon
            as={X}
            size={18}
            className="text-muted-foreground"
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
