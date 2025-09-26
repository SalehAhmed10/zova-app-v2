import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/core/supabase';

interface StripeAccountStatus {
  charges_enabled: boolean;
  details_submitted: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
}

interface StripeOnboardingCompleteProps {
  accountId: string;
  onStatusUpdate?: (status: StripeAccountStatus) => void;
}

export function StripeOnboardingComplete({ 
  accountId, 
  onStatusUpdate 
}: StripeOnboardingCompleteProps) {
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    checkAccountStatus();
  }, [accountId]);

  const checkAccountStatus = async () => {
    if (!accountId) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-account-status', {
        body: { account_id: accountId }
      });

      if (error) {
        console.error('Error checking account status:', error);
        return;
      }

      if (data) {
        setAccountStatus(data);
        onStatusUpdate?.(data);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const continueOnboarding = async () => {
    if (!accountId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-onboarding-link', {
        body: { 
          account_id: accountId,
          refresh_url: 'zova://provider-verification/payment',
          return_url: 'zova://provider-verification/payment'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        const result = await WebBrowser.openBrowserAsync(data.url, {
          dismissButtonStyle: 'cancel',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });

        // Check status after user returns
        if (result.type === 'cancel' || result.type === 'dismiss') {
          setTimeout(() => {
            checkAccountStatus();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      Alert.alert(
        'Onboarding Error',
        'Unable to continue Stripe onboarding. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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

  if (!accountStatus) {
    return (
      <Card>
        <CardContent className="p-4">
          <Text className="text-center text-red-600">
            Unable to check account status. Please try again.
          </Text>
          <Button
            onPress={checkAccountStatus}
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
  const hasCurrentRequirements = accountStatus.requirements.currently_due.length > 0;
  const hasPastDueRequirements = accountStatus.requirements.past_due.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isAccountReady ? '✅ Account Ready' :
           hasCurrentRequirements || hasPastDueRequirements ? '⚠️ Action Required' :
           '🔄 Setup In Progress'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAccountReady ? (
          <Text className="text-green-700 dark:text-green-300">
            Your Stripe account is fully set up and ready to receive payments!
          </Text>
        ) : (
          <>
            {(hasCurrentRequirements || hasPastDueRequirements) && (
              <View className="space-y-2">
                <Text className="font-medium text-foreground">
                  Complete these requirements:
                </Text>
                {[
                  ...accountStatus.requirements.past_due,
                  ...accountStatus.requirements.currently_due
                ].map((requirement, index) => (
                  <Text key={index} className="text-sm text-muted-foreground ml-4">
                    • {getRequirementDescription(requirement)}
                  </Text>
                ))}
              </View>
            )}

            {accountStatus.requirements.pending_verification.length > 0 && (
              <View className="space-y-2">
                <Text className="font-medium text-foreground">
                  Pending verification:
                </Text>
                {accountStatus.requirements.pending_verification.map((requirement, index) => (
                  <Text key={index} className="text-sm text-muted-foreground ml-4">
                    • {getRequirementDescription(requirement)}
                  </Text>
                ))}
              </View>
            )}

            {(hasCurrentRequirements || hasPastDueRequirements) && (
              <Button
                onPress={continueOnboarding}
                disabled={loading}
                className="w-full"
              >
                <Text className="text-primary-foreground font-medium">
                  {loading ? 'Loading...' : 'Complete Setup'}
                </Text>
              </Button>
            )}
          </>
        )}

        <Button
          onPress={checkAccountStatus}
          variant="outline"
          size="sm"
          disabled={isCheckingStatus}
        >
          <Text>Refresh Status</Text>
        </Button>
      </CardContent>
    </Card>
  );
}