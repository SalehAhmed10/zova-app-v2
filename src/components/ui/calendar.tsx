import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/lib/core/useColorScheme';

interface CalendarProps {
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  onClose: () => void;
  disabledDates?: string[]; // Array of dates in YYYY-MM-DD format that should be disabled
}

export function Calendar({ selectedDate, onDateSelect, onClose, disabledDates = [] }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { isDarkColorScheme } = useColorScheme();

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const formatDate = (year: number, month: number, day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateString;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === currentMonth.getMonth() &&
           today.getFullYear() === currentMonth.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const [year, month, dayNum] = selectedDate.split('-').map(Number);
    return year === currentMonth.getFullYear() &&
           month === currentMonth.getMonth() + 1 &&
           dayNum === day;
  };

  const isPast = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDisabled = (day: number) => {
    const dateString = formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const disabled = disabledDates.includes(dateString);
    return disabled;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDatePress = (day: number) => {
    const isPastDate = isPast(day);
    const isDisabledDate = isDisabled(day);
    
    if (isPastDate || isDisabledDate) {
      return;
    }
    
    const dateString = formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(dateString);
    onClose();
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={isDarkColorScheme ? '#9ca3af' : '#374151'} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground">Select Date</Text>
            <View className="w-6" />
          </View>
        </View>

        <ScrollView className="flex-1">
          {/* Month Navigation */}
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-foreground">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Week Days Header */}
            <View className="flex-row mb-2">
              {weekDays.map((day) => (
                <View key={day} className="flex-1 items-center py-2">
                  <Text className="text-sm font-medium text-muted-foreground">{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View className="flex-row flex-wrap">
              {days.map((day, index) => (
                <View key={index} className="w-[14.28%] aspect-square p-1">
                  {day ? (
                    <TouchableOpacity
                      onPress={() => handleDatePress(day)}
                      disabled={isPast(day) || isDisabled(day)}
                      className={`flex-1 items-center justify-center rounded-lg ${
                        isSelected(day)
                          ? 'bg-primary'
                          : isToday(day)
                          ? 'bg-primary/20 border-2 border-primary'
                          : isPast(day) || isDisabled(day)
                          ? 'bg-muted/50'
                          : 'bg-card border border-border'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        isSelected(day)
                          ? 'text-primary-foreground'
                          : isToday(day)
                          ? 'text-primary'
                          : isPast(day) || isDisabled(day)
                          ? 'text-muted-foreground'
                          : 'text-foreground'
                      }`}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-1" />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Quick Date Options */}
          <View className="px-4 pb-6">
            <Text className="text-sm font-medium text-foreground mb-3">Quick Select</Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'In 3 days', days: 3 },
                { label: 'Next week', days: 7 },
              ].map((option) => {
                const date = new Date();
                date.setDate(date.getDate() + option.days);
                const dateString = formatDate(date.getFullYear(), date.getMonth(), date.getDate());
                const isDateDisabled = disabledDates.includes(dateString) || isPast(date.getDate());

                return (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => {
                      if (!isDateDisabled) {
                        onDateSelect(dateString);
                        onClose();
                      }
                    }}
                    disabled={isDateDisabled}
                    className={`px-3 py-2 rounded-lg ${
                      isDateDisabled
                        ? 'bg-muted/50 opacity-50'
                        : 'bg-card border border-border'
                    }`}
                  >
                    <Text className={`text-sm ${
                      isDateDisabled ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}