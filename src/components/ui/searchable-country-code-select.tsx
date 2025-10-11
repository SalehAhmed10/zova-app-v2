import React, { useState, useMemo } from 'react';
import { View, Modal, TouchableOpacity, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { COUNTRIES } from '@/constants/countries';
import { Search, X, ChevronDown } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { useColorScheme } from '@/lib/core/useColorScheme';

interface CountryCode {
  name: string;
  dial_code: string;
  code: string;
  flag: string;
}

interface SearchableCountryCodeSelectProps {
  value?: CountryCode;
  onValueChange: (country: CountryCode | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableCountryCodeSelect({
  value,
  onValueChange,
  placeholder = "Select country code",
  disabled = false,
  className,
}: SearchableCountryCodeSelectProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDarkColorScheme } = useColorScheme();

  // Transform COUNTRIES data to include dial codes
  const countryCodes: CountryCode[] = useMemo(() => {
    return COUNTRIES.map(country => {
      // Get full country data to access phonecode
      const fullCountry = require('country-state-city').Country.getCountryByCode(country.code);
      return {
        name: country.label,
        dial_code: fullCountry?.phonecode ? `+${fullCountry.phonecode}` : `+${country.code}`,
        code: country.value,
        flag: country.flag || '🇺🇸', // Default flag
      };
    });
  }, []);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryCodes;

    const query = searchQuery.toLowerCase();
    return countryCodes.filter(country =>
      country.name.toLowerCase().includes(query) ||
      country.dial_code.includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  }, [countryCodes, searchQuery]);

  const handleSelect = (country: CountryCode) => {
    onValueChange(country);
    setIsVisible(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onValueChange(undefined);
  };

  const renderItem = ({ item }: { item: CountryCode }) => (
    <TouchableOpacity
      onPress={() => handleSelect(item)}
      className="px-4 py-3 border-b border-border"
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-lg">{item.flag}</Text>
        <View className="flex-1">
          <Text className="font-medium text-foreground">{item.name}</Text>
          <Text className="text-sm text-muted-foreground">{item.dial_code}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
        className={cn(
          "flex-row items-center justify-between p-3 border border-border rounded-lg bg-background h-11",
          disabled && "opacity-50",
          className
        )}
      >
        <View className="flex-row items-center gap-2 flex-1">
          {value && <Text className="text-lg">{value.flag}</Text>}
          <Text className={cn(
            "flex-1",
            value ? "text-foreground" : "text-muted-foreground"
          )}>
            {value ? value.dial_code : placeholder}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          {value && (
            <TouchableOpacity onPress={handleClear} className="p-1">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          )}
          <ChevronDown size={16} className="text-muted-foreground" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => setIsVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <Text variant="h3">Select Country Code</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <X size={24} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="p-4 border-b border-border">
            <View className="flex-row items-center gap-3">
              <Search size={20} className="text-muted-foreground" />
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search countries..."
                className="flex-1"
                autoFocus
              />
            </View>
          </View>

          {/* Country List */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-8">
                <Text className="text-muted-foreground">No countries found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}