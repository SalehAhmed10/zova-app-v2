import React, { useState, useMemo } from 'react';
import { View, Modal, FlatList, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, X, ChevronDown } from 'lucide-react-native';

interface Country {
  value: string;
  label: string;
  flag: string;
}

interface SearchableSelectProps {
  value?: Country;
  onValueChange: (country: Country | undefined) => void;
  placeholder?: string;
  countries: Country[];
  className?: string;
}

export function SearchableCountrySelect({
  value,
  onValueChange,
  placeholder = "Select country",
  countries,
  className
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return countries.slice(0, 20); // Show first 20 by default
    }

    const query = searchQuery.toLowerCase();
    return countries.filter(country =>
      country.label.toLowerCase().includes(query) ||
      country.value.toLowerCase().includes(query)
    ).slice(0, 50); // Limit to 50 results for performance
  }, [countries, searchQuery]);

  const handleSelect = (country: Country) => {
    onValueChange(country);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onValueChange(undefined);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className={cn(
          'border-input dark:bg-input/30 dark:active:bg-input/50 bg-background flex h-11 flex-row items-center justify-between gap-2 rounded-md border px-3 py-2 shadow-black/5',
          className
        )}
      >
        <View className="flex-1 flex-row items-center gap-2">
          {value?.flag && (
            <Text className="text-base">{value.flag}</Text>
          )}
          <Text
            className={cn(
              'text-sm flex-1',
              value ? 'text-foreground' : 'text-muted-foreground'
            )}
            numberOfLines={1}
          >
            {value?.label || placeholder}
          </Text>
        </View>
        <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <Text className="text-lg font-semibold">Select Country</Text>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              className="p-2"
            >
              <Icon as={X} size={20} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View className="px-4 py-3 border-b border-border">
            <View className="flex-row items-center gap-3">
              <Icon as={Search} size={16} className="text-muted-foreground" />
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search countries..."
                className="flex-1"
                autoFocus
              />
            </View>
          </View>

          {/* Results */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                className="flex-row items-center px-4 py-3 border-b border-border/50 active:bg-muted"
              >
                <Text className="text-lg mr-3">{item.flag}</Text>
                <View className="flex-1">
                  <Text className="text-foreground font-medium">{item.label}</Text>
                  <Text className="text-muted-foreground text-xs">{item.value}</Text>
                </View>
                {value?.value === item.value && (
                  <View className="w-2 h-2 bg-primary rounded-full" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="items-center justify-center py-8">
                <Text className="text-muted-foreground">No countries found</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />

          {/* Footer */}
          <View className="px-4 py-3 border-t border-border bg-background">
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                onPress={handleClear}
                className="flex-1"
              >
                <Text>Clear</Text>
              </Button>
              <Button
                variant="default"
                onPress={() => setIsOpen(false)}
                className="flex-1"
              >
                <Text>Done</Text>
              </Button>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}