/**
 * Booking Mode Selector Component
 * 
 * Allows users to choose between SOS (emergency) and normal booking modes
 * when checking out a service.
 */

import React from 'react';
import { View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Shield, Clock, CheckCircle, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface BookingModeOption {
  mode: 'normal' | 'sos';
  label: string;
  description: string;
  icon: any;
  features: string[];
  urgency?: string;
}

interface BookingModeSelectorProps {
  visible: boolean;
  onSelect: (mode: 'normal' | 'sos') => void;
  onCancel: () => void;
  hasSOSSubscription: boolean;
}

export const BookingModeSelector: React.FC<BookingModeSelectorProps> = ({
  visible,
  onSelect,
  onCancel,
  hasSOSSubscription,
}) => {
  const modes: BookingModeOption[] = [
    {
      mode: 'normal',
      label: 'Regular Booking',
      description: 'Schedule for a future date and time',
      icon: Clock,
      features: [
        'Choose preferred date & time',
        'Standard pricing',
        'Provider confirmation required',
        'Deposit based on provider',
      ],
      urgency: 'Flexible',
    },
    ...(hasSOSSubscription
      ? [
          {
            mode: 'sos' as const,
            label: 'SOS Emergency Booking',
            description: 'Urgent service for immediate needs',
            icon: Shield,
            features: [
              '🚨 Immediate availability search',
              '✓ Priority provider matching',
              '⚡ Instant confirmation',
              '📍 Location-based matching',
            ],
            urgency: 'URGENT (5-15 min response)',
          },
        ]
      : []),
  ];

  const handleSelect = (mode: 'normal' | 'sos') => {
    onSelect(mode);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView className="flex-1 bg-black/40">
        <View className="flex-1 justify-end">
          {/* Dismiss backdrop */}
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1"
            activeOpacity={1}
          />

          {/* Bottom Sheet */}
          <View className="bg-card rounded-t-3xl overflow-hidden max-h-[90%] border-t border-border">
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              scrollEnabled={true}
            >
              {/* Header with Close Button */}
              <View className="px-6 pt-5 pb-4 gap-2 flex-row items-center justify-between border-b border-border">
                <View className="flex-1 gap-1">
                  <Text className="text-2xl font-bold text-foreground">
                    Choose Booking Mode
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    Select how you want to book this service
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={onCancel}
                  className="ml-3 p-2 active:bg-muted rounded-full"
                >
                  <Icon as={X} size={20} className="text-muted-foreground" />
                </TouchableOpacity>
              </View>

              {/* Mode Options */}
              <View className="px-5 py-5 gap-4">
                {modes.map((mode) => {
                  const isDisabled = mode.mode === 'sos' && !hasSOSSubscription;
                  const IconComponent = mode.icon;

                  return (
                    <TouchableOpacity
                      key={mode.mode}
                      onPress={() => !isDisabled && handleSelect(mode.mode)}
                      disabled={isDisabled}
                      activeOpacity={isDisabled ? 1 : 0.6}
                    >
                      <Card className={`overflow-hidden ${isDisabled ? 'opacity-50' : ''}`}>
                        {/* Gradient background */}
                        <View
                          className={`absolute inset-0 ${
                            mode.mode === 'sos'
                              ? 'bg-gradient-to-b from-destructive/8 to-destructive/0'
                              : 'bg-gradient-to-b from-primary/8 to-primary/0'
                          }`}
                        />

                        <CardContent className="p-5 gap-4 relative z-10">
                          {/* Top Row: Icon + Title + Badge */}
                          <View className="flex-row items-start gap-3">
                            {/* Icon */}
                            <View
                              className={`w-14 h-14 rounded-xl items-center justify-center flex-shrink-0 ${
                                mode.mode === 'sos'
                                  ? 'bg-destructive/12'
                                  : 'bg-primary/12'
                              }`}
                            >
                              <Icon
                                as={IconComponent}
                                size={24}
                                className={
                                  mode.mode === 'sos'
                                    ? 'text-destructive'
                                    : 'text-primary'
                                }
                              />
                            </View>

                            {/* Title & Description */}
                            <View className="flex-1 gap-1 pr-2">
                              <View className="flex-row items-center gap-2 flex-wrap">
                                <Text
                                  className="font-bold text-base text-foreground"
                                >
                                  {mode.label}
                                </Text>
                                {mode.mode === 'sos' && hasSOSSubscription && (
                                  <View className="bg-destructive/12 px-2 py-1 rounded-full border border-destructive/25">
                                    <Text className="text-destructive text-xs font-bold">
                                      Premium
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text className="text-xs text-muted-foreground">
                                {mode.description}
                              </Text>
                            </View>
                          </View>

                          {/* Urgency Badge */}
                          <View
                            className={`flex-row items-center gap-2 px-3 py-2.5 rounded-lg border ${
                              mode.mode === 'sos'
                                ? 'bg-destructive/8 border-destructive/20'
                                : 'bg-primary/8 border-primary/20'
                            }`}
                          >
                            <Icon
                              as={mode.mode === 'sos' ? Shield : Clock}
                              size={14}
                              className={
                                mode.mode === 'sos'
                                  ? 'text-destructive/70'
                                  : 'text-primary/70'
                              }
                            />
                            <Text className="text-xs font-medium text-foreground flex-1">
                              {mode.urgency}
                            </Text>
                          </View>

                          {/* Features */}
                          <View className="gap-2">
                            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">
                              What's Included
                            </Text>
                            <View className="gap-1.5">
                              {mode.features.map((feature, idx) => (
                                <View key={idx} className="flex-row items-center gap-2">
                                  <Icon
                                    as={CheckCircle}
                                    size={14}
                                    className={
                                      mode.mode === 'sos'
                                        ? 'text-destructive/60'
                                        : 'text-primary/60'
                                    }
                                  />
                                  <Text className="text-xs text-foreground flex-1">
                                    {feature}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>

                          {/* Button */}
                          <Button
                            onPress={() => handleSelect(mode.mode)}
                            disabled={isDisabled}
                            className={`w-full mt-1 py-2.5 rounded-lg font-semibold ${
                              mode.mode === 'sos'
                                ? 'bg-destructive active:bg-destructive/90'
                                : 'bg-primary active:bg-primary/90'
                            }`}
                          >
                            <Text className="text-background font-semibold text-sm">
                              {mode.mode === 'sos'
                                ? 'Select Emergency'
                                : 'Select Regular'}
                            </Text>
                          </Button>
                        </CardContent>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Footer - Cancel Button & Info */}
              <View className="px-5 gap-3 pb-2">
                <Button
                  variant="outline"
                  onPress={onCancel}
                  className="w-full py-3 border border-border rounded-lg bg-background active:bg-muted min-h-[48px] items-center justify-center"
                >
                  <Text className="text-foreground font-semibold text-sm">Cancel</Text>
                </Button>

                {!hasSOSSubscription && (
                  <View className="bg-primary/8 border border-primary/20 rounded-lg p-3.5 gap-2">
                    <View className="flex-row items-center gap-2">
                      <Icon as={Shield} size={16} className="text-primary" />
                      <Text className="text-primary font-semibold text-xs flex-1">
                        Unlock Emergency Booking
                      </Text>
                    </View>
                    <Text className="text-primary/80 text-xs ml-6">
                      Subscribe to get 5-15 min response times
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
