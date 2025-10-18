import React, { useState, useMemo } from 'react';
import { View, Modal, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, X, ChevronDown, MapPin } from 'lucide-react-native';
import { getCitiesForState, getCitiesForCountry, getStatesForCountry } from '@/constants/countries';

interface CityOption {
  value: string;
  label: string;
}

interface SearchableCitySelectProps {
  value?: string;
  onValueChange: (city: string | undefined) => void;
  placeholder?: string;
  countryCode?: string;
  stateCode?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableCitySelect({
  value,
  onValueChange,
  placeholder = "Select city",
  countryCode,
  stateCode,
  className,
  disabled = false
}: SearchableCitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ FIX: Extract string code if countryCode is an object
  const countryCodeString = useMemo(() => {
    if (!countryCode) return undefined;
    
    // If countryCode is an object with a 'value' or 'code' property, extract it
    if (typeof countryCode === 'object') {
      const code = (countryCode as any).value || (countryCode as any).code;
      console.log('[CitySelect] Converted country object to code:', code);
      return code;
    }
    
    // Otherwise it's already a string
    return countryCode;
  }, [countryCode]);

  // Get cities based on country and state
  const allCities = useMemo(() => {
    if (!countryCodeString) {
      console.log('[CitySelect] No country code provided');
      return [];
    }

    console.log('[CitySelect] Fetching cities for country:', countryCodeString, 'state:', stateCode);

    let cities = [];
    if (stateCode) {
      // If state is selected, get cities for that state
      cities = getCitiesForState(countryCodeString, stateCode);
      console.log('[CitySelect] Found', cities.length, 'cities for state', stateCode);
    } else {
      // If no state selected, get all cities for the country
      cities = getCitiesForCountry(countryCodeString);
      console.log('[CitySelect] Found', cities.length, 'cities for country', countryCodeString);
    }

    return cities;
  }, [countryCodeString, stateCode]);

  const filteredCities = useMemo(() => {
    console.log('[CitySelect] All cities count:', allCities.length, 'Search query:', searchQuery);
    
    if (!searchQuery.trim()) {
      const defaultCities = allCities.slice(0, 50);
      console.log('[CitySelect] Showing default cities:', defaultCities.length);
      return defaultCities; // Show first 50 by default
    }

    const query = searchQuery.toLowerCase();
    const filtered = allCities.filter(city =>
      city.label.toLowerCase().includes(query)
    ).slice(0, 100); // Limit to 100 results for performance
    
    console.log('[CitySelect] Filtered cities:', filtered.length);
    return filtered;
  }, [allCities, searchQuery]);

  const handleSelect = (cityName: string) => {
    onValueChange(cityName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onValueChange(undefined);
    setIsOpen(false);
    setSearchQuery('');
  };

  const isDisabled = disabled || !countryCodeString;

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        onPress={() => !isDisabled && setIsOpen(true)}
        disabled={isDisabled}
        className={cn(
          'border-input dark:bg-input/30 dark:active:bg-input/50 bg-background flex h-11 flex-row items-center justify-between gap-2 rounded-md border px-3 py-2 shadow-black/5',
          isDisabled && 'opacity-50 bg-muted',
          className
        )}
      >
        <View className="flex-1 flex-row items-center gap-2">
          <Icon as={MapPin} size={16} className={cn("text-muted-foreground", isDisabled && "text-muted-foreground/50")} />
          <Text
            className={cn(
              'text-sm flex-1',
              value ? 'text-foreground' : 'text-muted-foreground',
              isDisabled && 'text-muted-foreground/50'
            )}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
        </View>
        <Icon as={ChevronDown} size={16} className={cn("text-muted-foreground", isDisabled && "text-muted-foreground/50")} />
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
            <Text className="text-lg font-semibold">Select City</Text>
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
                placeholder="Search cities..."
                className="flex-1"
                autoFocus
              />
            </View>
          </View>

          {/* Results */}
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item.label)}
                className="flex-row items-center px-4 py-3 border-b border-border/50 active:bg-muted"
              >
                <Icon as={MapPin} size={16} className="text-muted-foreground mr-3" />
                <View className="flex-1">
                  <Text className="text-foreground font-medium">{item.label}</Text>
                </View>
                {value === item.label && (
                  <View className="w-2 h-2 bg-primary rounded-full" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="items-center justify-center py-8">
                <Text className="text-muted-foreground">
                  {!countryCodeString ? 'Please select a country first' : 'No cities found'}
                </Text>
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