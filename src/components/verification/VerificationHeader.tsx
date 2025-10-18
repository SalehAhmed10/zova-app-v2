import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { LogoutButton } from '@/components/ui/logout-button';

interface VerificationHeaderProps {
  step: number;
  title: string;
  totalSteps?: number;
}

export const VerificationHeader: React.FC<VerificationHeaderProps> = ({ 
  step, 
  title, 
  totalSteps = 8  // ✅ FIXED: 8 steps (payment removed)
}) => {
  // Special handling for completion step
  const isComplete = step > totalSteps;
  const displayStep = isComplete ? null : step;
  const displayTotal = isComplete ? null : totalSteps;
  
  return (
    <View className="bg-background border-b border-border px-6 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text variant="h4" className="text-foreground font-semibold mb-1">
            {title}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {isComplete ? 'Application Submitted' : `Step ${displayStep} of ${displayTotal}`}
          </Text>
        </View>
        <LogoutButton 
          variant="ghost" 
          size="sm" 
          showIcon={false}
          className="px-3 py-1 h-8 ml-4"
        >
          <Text className="text-sm text-muted-foreground">Logout</Text>
        </LogoutButton>
      </View>

      {/* Progress Bar */}
      <View className="h-2 bg-muted rounded-full overflow-hidden">
        <View
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: isComplete ? '100%' : `${(step / totalSteps) * 100}%` }}
        />
      </View>
    </View>
  );
};