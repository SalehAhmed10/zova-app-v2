// ✅ MIGRATED: Now uses React Query + Zustand architecture (copilot-rules.md compliant)
// ❌ REMOVED: useState + useEffect patterns  
// ✅ ADDED: React Query for server state management

import React from 'react';
import { View, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/core/supabase';
import { useMutation } from '@tanstack/react-query';

// ✅ NEW: Using React Query hooks instead of useState + useEffect
import { 
  useStripeAccountStatus, 
  useRefreshStripeAccountStatus,
  type StripeAccountStatus 
} from '@/hooks/provider/useStripeAccountStatus';

interface StripeOnboardingCompleteProps {
  accountId: string;
  onStatusUpdate?: (status: StripeAccountStatus) => void;
}

export function StripeOnboardingComplete({ 
  accountId, 
  onStatusUpdate 
}: StripeOnboardingCompleteProps) {
  // ✅ MIGRATED: React Query hook replaces useState + useEffect
  const { 
    data: accountStatus, 
    isLoading: isCheckingStatus, 
    error,
    refetch 
  } = useStripeAccountStatus(accountId);
  
  // ✅ React Query mutation for refreshing status
  const refreshStatusMutation = useRefreshStripeAccountStatus();
  
  // ✅ REACT QUERY MUTATION: Continue onboarding (replaces useState loading)
  const continueOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('No account ID provided');

      const { data, error } = await supabase.functions.invoke('create-stripe-onboarding-link', {
        body: { 
          account_id: accountId,
          refresh_url: 'zova://provider-verification/payment',
          return_url: 'zova://provider-verification/payment'
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No onboarding URL received');

      return data.url;
    },
    onSuccess: async (url) => {
      const result = await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: 'cancel',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });

      // ✅ PURE REACT QUERY: Refresh status after user returns
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setTimeout(() => {
          refreshStatusMutation.mutate(accountId);
        }, 2000);
      }
    },
    onError: (error: any) => {
      console.error('Error creating onboarding link:', error);
      Alert.alert(
        'Onboarding Error',
        'Unable to continue Stripe onboarding. Please try again.'
      );
    },
  });

  // ✅ PURE CALLBACK: Call status update when data changes (no useEffect)
  React.useMemo(() => {
    if (accountStatus && onStatusUpdate) {
      onStatusUpdate(accountStatus);
    }
  }, [accountStatus, onStatusUpdate]);

  const getRequirementDescription = (requirement: string): string => {
    const descriptions: Record<string, string> = {
      'business_profile.mcc': 'Business category',
      'business_profile.url': 'Business website',
      'business_type': 'Business type',
      'company.address.city': 'Business address city',
      'company.address.line1': 'Business address',
      'company.address.postal_code': 'Business postal code',
      'company.address.state': 'Business address state',
      'company.name': 'Business name',
      'company.phone': 'Business phone number',
      'company.tax_id': 'Business tax ID',
      'external_account': 'Bank account details',
      'individual.address.city': 'Personal address city',
      'individual.address.line1': 'Personal address',
      'individual.address.postal_code': 'Personal postal code',
      'individual.address.state': 'Personal address state',
      'individual.dob.day': 'Date of birth',
      'individual.dob.month': 'Date of birth',
      'individual.dob.year': 'Date of birth',
      'individual.email': 'Email address',
      'individual.first_name': 'First name',
      'individual.id_number': 'ID number',
      'individual.last_name': 'Last name',
      'individual.phone': 'Phone number',
      'individual.ssn_last_4': 'SSN last 4 digits',
      'individual.verification.document': 'Identity verification document',
      'relationship.director': 'Company director information',
      'relationship.executive': 'Company executive information',
      'relationship.owner': 'Company owner information',
      'relationship.representative': 'Company representative information',
      'tos_acceptance.date': 'Terms of service acceptance',
      'tos_acceptance.ip': 'Terms of service acceptance'
    };

    return descriptions[requirement] || requirement.replace(/[._]/g, ' ');
  };

  // Handle loading state
  if (isCheckingStatus) {
    return (
      <Card>
        <CardContent className="p-4">
          <Text className="text-center text-muted-foreground">
            Checking account status...
          </Text>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error || !accountStatus) {
    return (
      <Card>
        <CardContent className="p-4">
          <Text className="text-center text-destructive">
            {error ? 'Error checking account status' : 'Unable to check account status'}. Please try again.
          </Text>
          <Button
            onPress={() => refetch()}
            variant="outline"
            size="sm"
            className="mt-2 self-center"
          >
            <Text>Retry</Text>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isAccountReady = accountStatus.charges_enabled && accountStatus.details_submitted;
  const hasCurrentRequirements = accountStatus.requirements?.currently_due?.length > 0;
  const hasPastDueRequirements = accountStatus.requirements?.past_due?.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isAccountReady ? '✅ Account Setup Complete' : '⚠️ Complete Account Setup'}
        </CardTitle>
      </CardHeader>
      <CardContent className="gap-4">
        {isAccountReady ? (
          <Text className="text-accent-foreground">
            Your Stripe account is fully set up and ready to receive payments.
          </Text>
        ) : (
          <View>
            <Text className="text-muted-foreground mb-4">
              Complete your Stripe account setup to start receiving payments.
            </Text>
            
            {hasPastDueRequirements && (
              <View className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 mb-4">
                <Text className="font-semibold text-destructive mb-2">⚠️ Past Due Requirements</Text>
                <Text className="text-sm text-destructive-foreground">
                  These items are past due and must be completed:
                </Text>
                {accountStatus.requirements.past_due.map((requirement, index) => (
                  <Text key={index} className="text-xs text-destructive-foreground mt-1">
                    • {getRequirementDescription(requirement)}
                  </Text>
                ))}
              </View>
            )}

            {hasCurrentRequirements && (
              <View className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800 mb-4">
                <Text className="font-semibold text-orange-900 dark:text-orange-100 mb-2">📋 Required Information</Text>
                <Text className="text-sm text-orange-800 dark:text-orange-200">
                  Please provide the following information:
                </Text>
                {accountStatus.requirements.currently_due.map((requirement, index) => (
                  <Text key={index} className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    • {getRequirementDescription(requirement)}
                  </Text>
                ))}
              </View>
            )}

            <Button
              onPress={() => continueOnboardingMutation.mutate()}
              disabled={continueOnboardingMutation.isPending}
              className="w-full"
            >
              <Text className="font-medium text-primary-foreground">
                {continueOnboardingMutation.isPending ? 'Opening...' : 'Continue Setup'}
              </Text>
            </Button>
          </View>
        )}

        <Button
          variant="outline"
          onPress={() => refreshStatusMutation.mutate(accountId)}
          disabled={refreshStatusMutation.isPending}
          className="w-full"
        >
          <Text>
            {refreshStatusMutation.isPending ? 'Checking...' : 'Check Status'}
          </Text>
        </Button>
      </CardContent>
    </Card>
  );
}