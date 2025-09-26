import React, { useState, useEffect } from 'react';
import { View, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/core/supabase';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';
// import { StripeOnboardingComplete } from '@/components/providers';
import { PaymentAnalyticsService } from '@/lib/payment/payment-analytics';

export default function PaymentSetupScreen() {
  const [loading, setLoading] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [accountSetupComplete, setAccountSetupComplete] = useState(false);
  
  const { 
    completeStep,
    nextStep,
    previousStep,
    setVerificationStatus,
    steps,
    isStepCompleted,
    currentStep
  } = useProviderVerificationStore();

  // Debug current verification state
  useEffect(() => {
    console.log('[Payment Screen] Current verification steps status:');
    for (let i = 1; i <= 9; i++) {
      const step = steps[i];
      console.log(`Step ${i} (${step?.title}): ${step?.isCompleted ? '✅ COMPLETED' : '❌ INCOMPLETE'}`);
    }
    console.log('[Payment Screen] Current step:', useProviderVerificationStore.getState().currentStep);
  }, [steps]);

  // Check account status when component mounts (user might be returning from Stripe)
  useEffect(() => {
    const checkForStripeReturn = async () => {
      // Track that payment prompt was shown
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await PaymentAnalyticsService.trackPaymentPromptShown(user.id, 'verification_complete');
      }

      // Check if user is returning from Stripe onboarding via URL params
      const url = await Linking.getInitialURL();
      const hasStripeReturnParams = url?.includes('status=complete') || url?.includes('status=refresh') ||
                                   url?.includes('complete') || url?.includes('refresh');

      if (hasStripeReturnParams) {
        // User is returning from Stripe onboarding, wait a bit for webhook processing then check account status
        setTimeout(async () => {
          await checkStripeAccountStatus(true, true); // Silent but show success if completed
        }, 2000); // 2 second delay to allow webhook processing
      } else {
        // Always check status on mount to ensure we have the latest data
        await checkStripeAccountStatus(true); // Silent check on mount
      }
    };

    checkForStripeReturn();
  }, []);

  // Warm up WebBrowser for better mobile performance (development builds only)
  useEffect(() => {
    const setupWebBrowser = async () => {
      try {
        // Android only: Start loading the default browser app in the background to improve transition time
        // Note: This only works in development builds, not Expo Go
        await WebBrowser.warmUpAsync();
      } catch (error) {
        // Silently fail in Expo Go - this is expected behavior
        console.log('WebBrowser warmUp not available in Expo Go');
      }
    };

    setupWebBrowser();

    return () => {
      const cleanup = async () => {
        try {
          // Android only: Cool down the browser when the component unmounts
          await WebBrowser.coolDownAsync();
        } catch (error) {
          // Silently fail in Expo Go - this is expected behavior
          console.log('WebBrowser coolDown not available in Expo Go');
        }
      };
      cleanup();
    };
  }, []);

  const checkStripeAccountStatus = async (silent = false, showSuccessOnChange = false) => {
    try {
      // First check database for any cached Stripe status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles')
          .select('stripe_account_id, stripe_charges_enabled, stripe_details_submitted, stripe_account_status')
          .eq('id', user.id)
          .single();

        if (profile?.stripe_account_id) {
          // Update local state with database status
          setStripeAccountId(profile.stripe_account_id);
          setAccountSetupComplete(profile.stripe_details_submitted === true && profile.stripe_charges_enabled === true);
        }
      }

      // Then call the edge function to check actual Stripe account status
      const { data, error } = await supabase.functions.invoke('check-stripe-account-status');

      if (error) {
        console.error('Error checking Stripe account status:', error);
        return;
      }

      if (data?.hasStripeAccount) {
        // Check if this is a status change (from incomplete to complete)
        const wasPreviouslyComplete = accountSetupComplete;
        const isNowComplete = data.accountSetupComplete;
        const statusChanged = !wasPreviouslyComplete && isNowComplete;

        // Update local state with real Stripe account status
        setStripeAccountId(data.accountId);
        setAccountSetupComplete(isNowComplete);

        // Update database with latest Stripe status
        if (user) {
          await supabase.from('profiles').update({
            stripe_charges_enabled: data.charges_enabled,
            stripe_details_submitted: data.details_submitted,
            stripe_account_status: data.charges_enabled ? 'active' : 'pending',
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
        }

        // Only complete the step if account is actually set up
        if (isNowComplete) {
          completeStep(9, {
            stripeAccountId: data.accountId,
            accountSetupComplete: true,
          });

          // Track successful payment setup completion
          await PaymentAnalyticsService.trackPaymentSetupCompleted(
            user.id, 
            data.accountId, 
            'verification_complete'
          );

          // Only show success alert if status changed OR if explicitly requested
          if (!silent && (statusChanged || showSuccessOnChange)) {
            Alert.alert(
              'Success!',
              'Your Stripe account has been successfully connected. You can now receive payments from customers.'
            );
          }
        } else {
          // Account exists but not fully onboarded - don't mark as complete
          if (!silent) {
            console.log('Stripe account exists but onboarding not complete');
          }
        }
      } else {
        // No Stripe account found, reset local state
        setStripeAccountId(null);
        setAccountSetupComplete(false);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    }
  };

  const handleStripeSetup = async () => {
    setLoading(true);
    try {
      // First try to refresh the session to get a fresh JWT token
      console.log('🔄 Refreshing session...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Refresh error:', refreshError);
        Alert.alert('Authentication Error', 'Please sign in again to continue');
        return;
      }

      // Get current session and user (should be fresh now)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        Alert.alert('Authentication Error', 'Please sign in again to continue');
        return;
      }

      if (!session?.user) {
        Alert.alert('Error', 'You must be logged in to set up payments');
        return;
      }

      const user = session.user;
      console.log('✅ User authenticated with fresh token:', user.id);
      console.log('📅 Access token expires at:', new Date(session.expires_at * 1000));
      console.log('🔑 JWT Token (first 50 chars):', session.access_token.substring(0, 50) + '...');
      console.log('🔑 Full JWT Token:', session.access_token);

      // Track payment setup started
      await PaymentAnalyticsService.trackPaymentSetupStarted(user.id, 'verification_complete');

      // First check if user already has a Stripe account
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single();

      // Always use the edge function to create/get onboarding URL
      // This ensures proper account link generation for both new and existing accounts
      console.log('Calling create-stripe-account function...');
      const { data, error } = await supabase.functions.invoke('create-stripe-account', {
        body: {
          userId: user.id,
          refreshUrl: 'zova://provider-verification/payment', // Deep link back to this screen
          returnUrl: 'zova://provider-verification/payment'   // Deep link back to this screen
        }
      });

      if (error) {
        console.error('Error setting up Stripe account:', error);
        
        // Handle specific authentication errors
        if (error.message?.includes('Invalid JWT') || error.message?.includes('Authentication')) {
          Alert.alert(
            'Authentication Error', 
            'Your session has expired. Please sign in again to continue.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // You could navigate to login screen here if needed
                  console.log('User needs to re-authenticate');
                }
              }
            ]
          );
        } else {
          Alert.alert('Setup Failed', `Failed to set up Stripe account: ${error.message || 'Unknown error'}`);
        }
        return;
      }

      if (data?.url) {
        // Give users options for how to complete Stripe onboarding
        Alert.alert(
          'Stripe Account Setup',
          'Choose how you\'d like to complete your Stripe onboarding:',
          [
            {
              text: 'Open in Mobile Browser',
              onPress: async () => {
                // Open Stripe onboarding in browser with optimized settings for mobile
                const result = await WebBrowser.openBrowserAsync(data.url, {
                  // Enhanced mobile browser configuration
                  dismissButtonStyle: 'cancel',
                  presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
                  controlsColor: '#007AFF', // iOS blue for better visibility
                  toolbarColor: '#ffffff',
                  secondaryToolbarColor: '#f8f9fa',
                  enableBarCollapsing: true,
                  showInRecents: false,
                  
                  // Enhanced browser behavior for banking OAuth flows
                  createTask: false, // Prevent creating new browser task on Android
                  showTitle: true,
                  
                  // Better mobile UX - simplified to avoid unknown properties
                  readerMode: false,
                });

                console.log('WebBrowser result:', result);
                
                // Handle browser closure - user might have completed onboarding
                if (result.type === 'cancel' || result.type === 'dismiss') {
                  // Wait a moment for potential webhook processing, then check status
                  setTimeout(async () => {
                    console.log('User returned from browser, checking account status...');
                    await checkStripeAccountStatus(true, true); // Silent but show success if completed
                  }, 1500);
                }
              }
            },
            {
              text: 'Copy Link & Use Desktop',
              onPress: async () => {
                try {
                  console.log('🔗 [Desktop Copy] URL to copy:', data.url);
                  console.log('🔗 [Desktop Copy] URL length:', data.url?.length);
                  console.log('🔗 [Desktop Copy] URL starts with https:', data.url?.startsWith('https://'));
                  
                  await Clipboard.setStringAsync(data.url);
                  Alert.alert(
                    'Link Copied!',
                    'The Stripe onboarding link has been copied to your clipboard.\n\n' +
                    '1. Paste it in your desktop browser\n' +
                    '2. Complete the Stripe setup\n' +
                    '3. Return to this screen and tap "Check Status"\n\n' +
                    'Your progress will sync automatically.',
                    [
                      { text: 'Check Status Now', onPress: () => checkStripeAccountStatus(false, true) },
                      { text: 'OK' }
                    ]
                  );
                } catch (error) {
                  console.error('❌ [Desktop Copy] Error copying URL:', error);
                  Alert.alert('Copy Failed', 'Unable to copy link. Please try the mobile browser option.');
                }
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else if (data?.accountSetupComplete) {
        // Account is already fully onboarded
        Alert.alert(
          'Account Already Set Up!',
          'Your Stripe account is already fully configured and ready to receive payments.'
        );

        // Update local state to reflect completion
        setStripeAccountId(data.accountId);
        setAccountSetupComplete(true);

        // Mark step as complete
        completeStep(9, {
          stripeAccountId: data.accountId,
          accountSetupComplete: true,
        });
      } else {
        Alert.alert('Setup Failed', 'Failed to get Stripe onboarding URL. Please try again.');
      }
    } catch (error) {
      console.error('Error setting up payment:', error);
      Alert.alert('Setup Failed', `Failed to set up payment account: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getIncompleteSteps = () => {
    const incompleteSteps = [];
    for (let i = 1; i <= 8; i++) { // Check steps 1-8 (9 is payment)
      if (!isStepCompleted(i)) {
        incompleteSteps.push({
          step: i,
          title: steps[i]?.title || `Step ${i}`,
          description: steps[i]?.description || ''
        });
      }
    }
    return incompleteSteps;
  };

  const navigateToStep = (stepNumber: number) => {
    setVerificationStatus('pending'); // Reset to allow navigation
    router.push(`/provider-verification/${getStepRoute(stepNumber)}` as any);
  };

  const getStepRoute = (stepNumber: number): string => {
    switch (stepNumber) {
      case 1: return 'index'; // Document upload
      case 2: return 'selfie'; // Selfie verification
      case 3: return 'business-info'; // Business information
      case 4: return 'category'; // Service category
      case 5: return 'services'; // Service selection
      case 6: return 'portfolio'; // Portfolio upload
      case 7: return 'bio'; // Business bio
      case 8: return 'terms'; // Terms & conditions
      default: return 'index';
    }
  };

  const handleCompleteVerification = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Complete step 9
      completeStep(9, {
        stripeAccountId,
        accountSetupComplete,
      });

      // Update verification status in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          is_verified: false, // Will be set to true when admin approves
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating verification status:', updateError);
        Alert.alert('Error', 'Failed to complete verification. Please try again.');
        return;
      }

      console.log('[Payment] Successfully updated verification status to pending');
      console.log('[Payment] Navigating to complete screen');

      // Navigate to complete screen
      router.push('/provider-verification/complete');
    } catch (error) {
      console.error('Error completing verification:', error);
      Alert.alert('Error', 'Failed to complete verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollable={true} contentContainerClassName="px-6 py-4">
      {/* Header */}
      <Animated.View 
        entering={FadeIn.delay(200).springify()}
        className="items-center mb-8"
      >
        <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
          <Ionicons name="card" size={32} color="white" />
        </View>
        <Text className="text-2xl font-bold text-foreground mb-2">
          Payment Setup
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Set up your Stripe account to receive payments from customers
        </Text>
      </Animated.View>

      {/* Current Status */}
      <Animated.View entering={SlideInDown.delay(300).springify()} className="mb-6">
        {accountSetupComplete ? (
          <View className="p-4 bg-accent rounded-lg border border-accent">
          <View className="flex-row items-center mb-2">
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text className="font-semibold text-accent-foreground ml-2">
              Account Setup Complete
            </Text>
          </View>
            <Text className="text-accent-foreground text-sm">
              Your Stripe account is configured and ready to receive payments.
            </Text>
            {stripeAccountId && (
              <Text className="text-accent-foreground text-xs mt-2">
                Account ID: {stripeAccountId}
              </Text>
            )}
          </View>
        ) : (
          <View className="p-4 bg-secondary rounded-lg border border-secondary">
          <View className="flex-row items-center mb-2">
            <Ionicons name="link" size={20} color="#64748b" />
            <Text className="font-semibold text-secondary-foreground ml-2">
              Stripe Connect Required
            </Text>
          </View>
            <Text className="text-secondary-foreground text-sm">
              You'll need to connect your Stripe account to receive payments. This process is secure and takes just a few minutes.
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Incomplete Steps Warning */}
      {(() => {
        const incompleteSteps = getIncompleteSteps();
        if (incompleteSteps.length > 0) {
          return (
            <Animated.View entering={SlideInDown.delay(350).springify()} className="mb-6">
              <View className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="warning" size={20} color="#f59e0b" />
                  <Text className="font-semibold text-orange-900 dark:text-orange-100 ml-2">
                    Incomplete Steps Found
                  </Text>
                </View>
                <Text className="text-orange-800 dark:text-orange-200 text-sm mb-3">
                  You have {incompleteSteps.length} incomplete step{incompleteSteps.length > 1 ? 's' : ''} that need to be completed before submitting verification:
                </Text>
                <View className="space-y-2">
                  {incompleteSteps.map((step) => (
                    <View key={step.step} className="flex-row items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-orange-200 dark:border-orange-700">
                      <View className="flex-1">
                        <Text className="font-medium text-orange-900 dark:text-orange-100">
                          Step {step.step}: {step.title}
                        </Text>
                        <Text className="text-sm text-orange-700 dark:text-orange-300">
                          {step.description}
                        </Text>
                      </View>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => navigateToStep(step.step)}
                        className="ml-2"
                      >
                        <Text className="text-xs">Complete</Text>
                      </Button>
                    </View>
                  ))}
                </View>
                <Text className="text-orange-700 dark:text-orange-300 text-xs mt-3">
                  💡 Complete these steps to ensure your verification application is complete and ready for review.
                </Text>
              </View>
            </Animated.View>
          );
        }
        return null;
      })()}

      {/* Stripe Onboarding Component - Removed to avoid duplicate buttons */}
      {/* {stripeAccountId && !accountSetupComplete && (
        <Animated.View entering={SlideInDown.delay(500).springify()} className="mb-6">
          <StripeOnboardingComplete 
            accountId={stripeAccountId}
            onStatusUpdate={(status) => {
              const isReady = status.charges_enabled && status.details_submitted;
              setAccountSetupComplete(isReady);
              if (isReady) {
                completeStep(9, {
                  stripeAccountId,
                  accountSetupComplete: true,
                });
              }
            }}
          />
        </Animated.View>
      )} */}

      {/* Stripe Features */}
      <Animated.View entering={SlideInDown.delay(400).springify()} className={accountSetupComplete ? "mb-4" : "mb-6"}>
        <Text className="text-lg font-semibold text-foreground mb-4">
          Why Stripe?
        </Text>
        <View className="mb-6">
          <View className="flex-row items-start mb-3">
            <View className="w-6 h-6 bg-accent rounded-full justify-center items-center mt-0.5 mr-3">
              <Ionicons name="checkmark" size={12} color="#22c55e" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">Fast & Secure Payments</Text>
              <Text className="text-sm text-muted-foreground">
                Industry-leading security with instant payment processing
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-start mb-3">
            <View className="w-6 h-6 bg-accent rounded-full justify-center items-center mt-0.5 mr-3">
              <Ionicons name="checkmark" size={12} color="#22c55e" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">Automatic Transfers</Text>
              <Text className="text-sm text-muted-foreground">
                Funds transferred to your bank account in 2-3 business days
              </Text>
            </View>
          </View>

          <View className="flex-row items-start mb-3">
            <View className="w-6 h-6 bg-accent rounded-full justify-center items-center mt-0.5 mr-3">
              <Ionicons name="checkmark" size={12} color="#22c55e" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">Global Support</Text>
              <Text className="text-sm text-muted-foreground">
                Accept payments from customers worldwide
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-6 h-6 bg-accent rounded-full justify-center items-center mt-0.5 mr-3">
              <Ionicons name="checkmark" size={12} color="#22c55e" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">Detailed Analytics</Text>
              <Text className="text-sm text-muted-foreground">
                Track your earnings and payment history
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Mobile Browser Tips */}
      {!accountSetupComplete && (
        <Animated.View entering={SlideInDown.delay(500).springify()} className="mb-6">
          <View className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <View className="flex-row items-center mb-2">
              <Ionicons name="information-circle" size={16} color="#3b82f6" />
              <Text className="font-semibold text-blue-900 dark:text-blue-100 ml-2">
                Setup Options Available
              </Text>
            </View>
            <Text className="text-blue-800 dark:text-blue-200 text-sm mb-2">
              Choose the setup method that works best for you:
            </Text>
            <Text className="text-blue-700 dark:text-blue-300 text-sm mb-1">
              🎯 <Text className="font-medium">Mobile Browser:</Text> Quick setup on this device
            </Text>
            <Text className="text-blue-700 dark:text-blue-300 text-sm mb-1">
              💻 <Text className="font-medium">Desktop Option:</Text> Copy link and complete on computer
            </Text>
            <Text className="text-blue-700 dark:text-blue-300 text-sm mb-1">
              🔄 <Text className="font-medium">Status Check:</Text> Verify completion from any method
            </Text>
            <Text className="text-blue-700 dark:text-blue-300 text-sm">
              ✨ <Text className="font-medium">Auto-Sync:</Text> Progress syncs across all devices
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Setup Button */}
      <Animated.View entering={SlideInDown.delay(600).springify()} className={accountSetupComplete ? "mb-4" : "mb-6"}>
        {!accountSetupComplete ? (
          <View>
            <Button
              size="lg"
              onPress={handleStripeSetup}
              disabled={loading}
              className="w-full mb-4"
            >
              <Text className="font-semibold text-primary-foreground">
                {loading ? 'Setting up...' : stripeAccountId ? 'Continue Stripe Setup' : 'Set up Stripe Account'}
              </Text>
            </Button>
            
            {/* Alternative options for mobile browser issues */}
            <View className="mt-4 pt-4 border-t border-border">
              <Text className="text-sm font-medium text-foreground mb-3 text-center">
                Having trouble with mobile browser?
              </Text>
              
              <Button
                variant="secondary"
                size="sm"
                onPress={() => checkStripeAccountStatus(false, true)} // Not silent, show success if status changed
                className="w-full mb-3"
                disabled={loading}
              >
                <View className="flex-row items-center">
                  <Ionicons name="refresh" size={16} color="#64748b" className="mr-2" />
                  <Text className="font-medium">
                    {loading ? 'Checking...' : 'Check Account Status'}
                  </Text>
                </View>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  Alert.alert(
                    'Desktop Setup Available',
                    'You can complete Stripe setup on desktop:\n\n1. Visit stripe.com and log into your account\n2. Complete the Connect onboarding\n3. Return to this screen and tap "Check Status"\n\nYour account will sync automatically.',
                    [
                      { text: 'Check Status Now', onPress: () => checkStripeAccountStatus(false, true) },
                      { text: 'OK' }
                    ]
                  );
                }}
                className="w-full mb-3"
              >
                <Text className="font-medium">Desktop Setup Instructions</Text>
              </Button>

              {/* Only show skip option if account exists but onboarding failed */}
              {stripeAccountId && (
                <View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handleCompleteVerification}
                    disabled={loading}
                    className="w-full mb-2"
                  >
                    <Text className="font-semibold">
                      {loading ? 'Completing...' : 'Skip Stripe Setup (Not Recommended)'}
                    </Text>
                  </Button>
                  <Text className="text-xs text-muted-foreground text-center">
                    ⚠️ Only use this if Stripe setup is completely blocked. You'll need to complete Stripe setup later to receive payments.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View>
            <Text className="text-center text-muted-foreground text-sm mb-4">
              {getIncompleteSteps().length > 0 
                ? `Complete the ${getIncompleteSteps().length} incomplete step${getIncompleteSteps().length > 1 ? 's' : ''} above before proceeding.`
                : 'All verification steps completed! Ready to submit for review.'
              }
            </Text>
            <Button
              size="lg"
              onPress={handleCompleteVerification}
              disabled={loading || getIncompleteSteps().length > 0}
              className="w-full"
            >
              <Text className="font-semibold text-primary-foreground">
                {loading ? 'Completing...' : getIncompleteSteps().length > 0 ? 'Complete Missing Steps First' : 'Complete Verification'}
              </Text>
            </Button>
          </View>
        )}
      </Animated.View>

      {/* Important Notice */}
      <Animated.View entering={SlideInDown.delay(700).springify()} className="mb-4">
        <View className="p-4 bg-muted rounded-lg border border-muted">
          <View className="flex-row items-center mb-2">
            <Ionicons name="warning" size={16} color="#f59e0b" />
            <Text className="font-semibold text-muted-foreground ml-2">
              Important Information
            </Text>
          </View>
          <View>
            <Text className="text-muted-foreground text-sm mb-1">
              • Standard Stripe processing fees apply (2.9% + $0.30 per transaction)
            </Text>
            <Text className="text-muted-foreground text-sm mb-1">
              • You'll need a valid government ID and bank account
            </Text>
            <Text className="text-muted-foreground text-sm mb-1">
              • Account verification typically takes 1-2 business days
            </Text>
            <Text className="text-muted-foreground text-sm">
              • You can modify your account settings anytime
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Back Button */}
      <Animated.View entering={SlideInDown.delay(500).springify()}>
        <Button
          variant="outline"
          size="lg"
          onPress={previousStep}
          className="w-full"
        >
          <Text>Back to Terms & Conditions</Text>
        </Button>
      </Animated.View>
    </ScreenWrapper>
  );
}