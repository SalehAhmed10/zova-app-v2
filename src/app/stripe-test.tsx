import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/core/supabase';
import { useAuth } from '@/hooks';

export default function StripeTestScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [lastCreateResult, setLastCreateResult] = useState<string | null>(null);

  // Log when component mounts
  useEffect(() => {
    console.log('🧪 [Stripe Test] Component mounted');
    console.log('🧪 [Stripe Test] User:', user?.id || 'No user');
    console.log('🧪 [Stripe Test] User email:', user?.email || 'No email');
  }, [user]);

  const testCreateStripeAccount = async () => {
    console.log('🧪 [Test] Starting Stripe account creation test...');
    
    if (!user?.id) {
      console.log('❌ [Test] No user logged in');
      setResult('❌ No user logged in');
      return;
    }

    console.log('🧪 [Test] User ID:', user.id);
    setLoading(true);
    setResult('🔄 Creating Stripe account...');

    try {
      console.log('🧪 [Test] Invoking create-stripe-account Edge Function...');
      const { data, error } = await supabase.functions.invoke('create-stripe-account', {
        body: { user_id: user.id }
      });

      console.log('🧪 [Test] Edge Function response:', { data, error });

      if (error) {
        console.log('❌ [Test] Error from Edge Function:', error);
        setResult(`❌ Error: ${error.message}`);
        setLastCreateResult(null);
      } else {
        console.log('✅ [Test] Success! Account created:', data.stripeAccountId);
        console.log('🔗 [Test] Onboarding URL:', data.accountLink);
        console.log('💰 [Test] Commission Rate:', data.commissionRate);
        console.log('📅 [Test] Payout Schedule:', data.payoutSchedule);
        console.log('💷 [Test] Minimum Payout:', data.minimumPayout);
        const successMessage = `✅ SUCCESS! Stripe account created!\n\nAccount ID: ${data.stripeAccountId}\nCommission: ${data.commissionRate}\nPayout: ${data.payoutSchedule}\nMinimum: ${data.minimumPayout}\n\n🔗 Onboarding URL:\n${data.accountLink}`;
        setResult(successMessage);
        setLastCreateResult(data.stripeAccountId);
      }
    } catch (error) {
      console.log('💥 [Test] Exception caught:', error);
      setResult(`❌ Exception: ${error}`);
    } finally {
      console.log('🧪 [Test] Create account test completed');
      setLoading(false);
    }
  };

  const testCheckAccountStatus = async () => {
    console.log('🧪 [Test] Starting account status check...');
    setLoading(true);
    setResult('🔄 Checking account status...');

    try {
      console.log('🧪 [Test] Getting session for auth...');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      console.log('🧪 [Test] Invoking check-stripe-account-status Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('check-stripe-account-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {} // No body needed, function gets user from auth header
      });

      console.log('🧪 [Test] Status check response:', { data, error });

      if (error) {
        console.log('❌ [Test] Error from status check:', error);
        setResult(`❌ Error: ${error.message}`);
      } else {
        console.log('✅ [Test] Status check successful');
        console.log('📊 [Test] Account data:', data);
        setResult(`✅ Status: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      console.log('💥 [Test] Exception in status check:', error);
      setResult(`❌ Exception: ${error}`);
    } finally {
      console.log('🧪 [Test] Status check test completed');
      setLoading(false);
    }
  };

  const testCreateOnboardingLink = async () => {
    console.log('🧪 [Test] Starting onboarding link creation...');
    
    // First get the user's Stripe account ID
    console.log('🧪 [Test] Fetching user profile for Stripe account ID...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user?.id)
      .single();

    console.log('🧪 [Test] Profile data:', profile);

    if (!profile?.stripe_account_id) {
      console.log('❌ [Test] No Stripe account found in profile');
      setResult('❌ No Stripe account found. Create one first.');
      return;
    }

    console.log('🧪 [Test] Found Stripe account:', profile.stripe_account_id);
    setLoading(true);
    setResult('🔄 Creating onboarding link...');

    try {
      console.log('🧪 [Test] Invoking create-stripe-onboarding-link Edge Function...');
      const requestBody = { 
        account_id: profile.stripe_account_id,
        refresh_url: 'zova://test',
        return_url: 'zova://test'
      };
      console.log('🧪 [Test] Request body:', requestBody);

      const { data, error } = await supabase.functions.invoke('create-stripe-onboarding-link', {
        body: requestBody
      });

      console.log('🧪 [Test] Onboarding link response:', { data, error });

      if (error) {
        console.log('❌ [Test] Error creating onboarding link:', error);
        setResult(`❌ Error: ${error.message}`);
      } else {
        console.log('✅ [Test] Onboarding link created successfully');
        console.log('🔗 [Test] Link URL:', data.url);
        setResult(`✅ Link created: ${data.url}`);
      }
    } catch (error) {
      console.log('💥 [Test] Exception in onboarding link creation:', error);
      setResult(`❌ Exception: ${error}`);
    } finally {
      console.log('🧪 [Test] Onboarding link test completed');
      setLoading(false);
    }
  };

  const testDatabaseQueries = async () => {
    console.log('🧪 [Test] Starting database queries test...');
    setLoading(true);
    setResult('🔄 Testing database queries...');

    try {
      // Test profiles query
      console.log('🧪 [Test] Querying profiles table...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      console.log('🧪 [Test] Profiles query result:', { profile, profileError });

      if (profileError) {
        console.log('❌ [Test] Profile query error:', profileError);
        setResult(`❌ Profile Error: ${profileError.message}`);
        return;
      }

      // Test provider_payouts query
      console.log('🧪 [Test] Querying provider_payouts table...');
      const { data: payouts, error: payoutsError } = await supabase
        .from('provider_payouts')
        .select('*')
        .eq('provider_id', user?.id)
        .limit(5);

      console.log('🧪 [Test] Payouts query result:', { payouts, payoutsError });

      if (payoutsError) {
        console.log('❌ [Test] Payouts query error:', payoutsError);
        setResult(`❌ Payouts Error: ${payoutsError.message}`);
        return;
      }

      console.log('✅ [Test] Database queries successful');
      console.log('📊 [Test] Profile found:', !!profile);
      console.log('📊 [Test] Stripe account:', profile?.stripe_account_id || 'None');
      console.log('📊 [Test] Payouts count:', payouts?.length || 0);

      setResult(`✅ Database Test Success:
Profile: ${profile ? 'Found' : 'Not found'}
Stripe Account: ${profile?.stripe_account_id || 'None'}
Payouts: ${payouts?.length || 0} found`);
    } catch (error) {
      console.log('💥 [Test] Exception in database queries:', error);
      setResult(`❌ Exception: ${error}`);
    } finally {
      console.log('🧪 [Test] Database queries test completed');
      setLoading(false);
    }
  };

  const openStripeOnboarding = async () => {
    console.log('🔗 [Stripe] Opening fresh onboarding link...');
    setLoading(true);
    
    try {
      // First get the user's Stripe account ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.stripe_account_id) {
        console.log('❌ [Stripe] No Stripe account found');
        setResult('❌ No Stripe account found. Create one first.');
        setLoading(false);
        return;
      }

      console.log('🔗 [Stripe] Creating fresh onboarding link for:', profile.stripe_account_id);
      
      // Create a fresh onboarding link
      const { data, error } = await supabase.functions.invoke('create-stripe-onboarding-link', {
        body: { 
          account_id: profile.stripe_account_id,
          refresh_url: 'https://zova.app/stripe-refresh',
          return_url: 'https://zova.app/stripe-complete'
        }
      });

      if (error) {
        console.log('❌ [Stripe] Error creating link:', error);
        setResult(`❌ Error: ${error.message}`);
        setLoading(false);
        return;
      }

      console.log('✅ [Stripe] Fresh link created:', data.url);
      console.log('🌐 [Stripe] Opening in browser...');
      
      // Open in web browser
      await WebBrowser.openBrowserAsync(data.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
      
      setResult(`✅ Opened fresh onboarding link in browser\n\nAccount: ${profile.stripe_account_id}`);
    } catch (error) {
      console.log('💥 [Stripe] Exception:', error);
      setResult(`❌ Exception: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkDetailedAccountStatus = async () => {
    console.log('🔍 [Status] Starting detailed account status check...');
    setLoading(true);
    setResult('🔄 Checking detailed account status...');

    try {
      // First get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (!profile) {
        setResult('❌ No profile found');
        setLoading(false);
        return;
      }

      console.log('📊 [Status] Profile data:', profile);
      
      if (!profile.stripe_account_id) {
        setResult('❌ No Stripe account ID in profile');
        setLoading(false);
        return;
      }

      // Check account status via Edge Function
      console.log('🔍 [Status] Getting session for auth...');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const { data: statusData, error: statusError } = await supabase.functions.invoke('check-stripe-account-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {} // No body needed, function gets user from auth header
      });

      console.log('📊 [Status] Account status response:', { statusData, statusError });

      if (statusError) {
        console.log('❌ [Status] Error from status check:', statusError);
        setResult(`❌ Status Check Error: ${statusError.message}`);
        return;
      }

      // Format detailed status
      const statusInfo = `✅ DETAILED ACCOUNT STATUS

👤 Profile Info:
• Name: ${profile.full_name || 'Not set'}
• Email: ${profile.email || 'Not set'}
• Role: ${profile.role || 'Not set'}

💳 Stripe Account:
• Account ID: ${profile.stripe_account_id}
• Status: ${statusData ? JSON.stringify(statusData, null, 2) : 'No status data'}

📊 Verification:
• Onboarding: ${profile.onboarding_complete ? '✅ Complete' : '❌ Incomplete'}
• Verified: ${profile.is_verified ? '✅ Yes' : '❌ No'}`;

      console.log('✅ [Status] Detailed status compiled');
      setResult(statusInfo);

    } catch (error) {
      console.log('💥 [Status] Exception:', error);
      setResult(`❌ Exception: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseSync = async () => {
    console.log('🔄 [Sync] Checking database sync with Stripe status...');
    setLoading(true);
    setResult('🔄 Verifying database sync...');

    try {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (!profile) {
        setResult('❌ No profile found');
        setLoading(false);
        return;
      }

      // Get Stripe status
      console.log('🔄 [Sync] Getting session for auth...');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const { data: statusData, error: statusError } = await supabase.functions.invoke('check-stripe-account-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {}
      });

      if (statusError) {
        setResult(`❌ Status Check Error: ${statusError.message}`);
        return;
      }

      // Compare database vs Stripe
      const syncStatus = `🔄 DATABASE SYNC VERIFICATION

📊 DATABASE STATUS:
• Account Status: ${profile.stripe_account_status || 'null'}
• Charges Enabled: ${profile.stripe_charges_enabled ? '✅' : '❌'}
• Details Submitted: ${profile.stripe_details_submitted ? '✅' : '❌'}

🔗 STRIPE REALITY:
• Account Status: ${statusData.hasStripeAccount ? 'active' : 'none'}
• Charges Enabled: ${statusData.charges_enabled ? '✅' : '❌'}
• Details Submitted: ${statusData.details_submitted ? '✅' : '❌'}

✅ SYNC STATUS:
• Account Status: ${profile.stripe_account_status === 'active' && statusData.hasStripeAccount ? '✅ SYNCED' : '❌ OUT OF SYNC'}
• Charges: ${profile.stripe_charges_enabled === statusData.charges_enabled ? '✅ SYNCED' : '❌ OUT OF SYNC'}
• Details: ${profile.stripe_details_submitted === statusData.details_submitted ? '✅ SYNCED' : '❌ OUT OF SYNC'}

🎯 ACCOUNT ID: ${statusData.accountId}
📅 Last Updated: ${new Date(profile.updated_at).toLocaleString()}`;

      console.log('✅ [Sync] Database sync verification completed');
      setResult(syncStatus);

    } catch (error) {
      console.log('💥 [Sync] Exception:', error);
      setResult(`❌ Exception: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createFreshStripeAccount = async () => {
    console.log('🆕 [Fresh] Creating completely fresh Stripe account...');
    setLoading(true);
    setResult('🔄 Creating fresh Stripe account for testing...');

    try {
      if (!user?.id) {
        setResult('❌ No user logged in');
        setLoading(false);
        return;
      }

      // First clear any existing Stripe account reference
      console.log('🆕 [Fresh] Clearing existing Stripe account reference...');
      await supabase
        .from('profiles')
        .update({ stripe_account_id: null })
        .eq('id', user.id);

      console.log('🆕 [Fresh] Creating new Stripe account...');
      const { data, error } = await supabase.functions.invoke('create-stripe-account', {
        body: { user_id: user.id }
      });

      if (error) {
        console.log('❌ [Fresh] Error creating fresh account:', error);
        setResult(`❌ Error: ${error.message}`);
        setLoading(false);
        return;
      }

      console.log('✅ [Fresh] Fresh account created successfully!');
      console.log('🆕 [Fresh] New Account ID:', data.stripeAccountId);
      console.log('🔗 [Fresh] Fresh Onboarding URL:', data.accountLink);

      const freshSuccessMessage = `✅ FRESH STRIPE ACCOUNT CREATED!

🆕 New Account ID: ${data.stripeAccountId}
💰 Commission: ${data.commissionRate}
📅 Payout: ${data.payoutSchedule}
💷 Minimum: ${data.minimumPayout}

🔗 Fresh Onboarding URL:
${data.accountLink}

✨ This is a completely new account - use the test values below!`;
      
      setResult(freshSuccessMessage);
      setLastCreateResult(data.stripeAccountId);

    } catch (error) {
      console.log('💥 [Fresh] Exception:', error);
      setResult(`❌ Exception: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => {
          console.log('🧪 [Navigation] Back button pressed');
          router.back();
        }}>
          <Text className="text-lg">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">Stripe Test</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="space-y-6">
          {/* Test Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Stripe Integration Tests</CardTitle>
              <Text className="text-sm text-muted-foreground">
                Use proper test values for successful onboarding
              </Text>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onPress={() => {
                  console.log('🧪 [Button] Create Stripe Account test button pressed');
                  testCreateStripeAccount();
                }}
                disabled={loading}
                className="w-full"
              >
                <Text className="text-primary-foreground font-medium">
                  Test Create Stripe Account
                </Text>
              </Button>

              <Button 
                onPress={() => {
                  console.log('🆕 [Button] Create Fresh Stripe Account button pressed');
                  createFreshStripeAccount();
                }}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <Text className="text-destructive-foreground font-medium">
                  🆕 Create Fresh Account (Clears Old)
                </Text>
              </Button>

              <Button 
                onPress={() => {
                  console.log('🧪 [Button] Check Account Status test button pressed');
                  testCheckAccountStatus();
                }}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Text className="font-medium">
                  Test Check Account Status
                </Text>
              </Button>

              <Button 
                onPress={() => {
                  console.log('🔍 [Button] Detailed Account Status button pressed');
                  checkDetailedAccountStatus();
                }}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Text className="font-medium">
                  🔍 Detailed Account Status
                </Text>
              </Button>

              <Button 
                onPress={() => {
                  console.log('🧪 [Button] Create Onboarding Link test button pressed');
                  testCreateOnboardingLink();
                }}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Text className="font-medium">
                  Test Create Onboarding Link
                </Text>
              </Button>

              <Button 
                onPress={() => {
                  console.log('🧪 [Button] Database Queries test button pressed');
                  testDatabaseQueries();
                }}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Text className="font-medium">
                  Test Database Queries
                </Text>
              </Button>

              <Button 
                onPress={() => {
                  console.log('🔗 [Button] Open Stripe Onboarding button pressed');
                  openStripeOnboarding();
                }}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                <Text className="font-medium">
                  🌐 Open Stripe Onboarding
                </Text>
              </Button>
            </CardContent>
          </Card>

          {/* Success Message */}
          {lastCreateResult && (
            <Card className="mt-4 border-green-500 bg-green-50 dark:bg-green-950">
              <CardContent className="p-4">
                <Text variant="h3" className="mb-2 text-green-700 dark:text-green-300">
                  🎉 Onboarding Complete!
                </Text>
                <Text className="text-green-600 dark:text-green-400 mb-3">
                  Your Stripe account setup was successful. Click "Check Account Status" to verify your account details.
                </Text>
                <Button
                  onPress={checkDetailedAccountStatus}
                  className="bg-green-600 active:bg-green-700 mb-3"
                >
                  <Text className="text-white font-medium">
                    ✅ Verify Account Status
                  </Text>
                </Button>

                <Button
                  onPress={checkDatabaseSync}
                  className="bg-blue-600 active:bg-blue-700"
                >
                  <Text className="text-white font-medium">
                    🔄 Check Database Sync
                  </Text>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Test Values Guide */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Test Values for Stripe Onboarding</CardTitle>
              <Text className="text-sm text-muted-foreground">
                Use these values for successful test onboarding
              </Text>
            </CardHeader>
            <CardContent className="space-y-3">
              <View className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                <Text className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                  🚨 CRITICAL: Phone Number Step
                </Text>
                <Text className="text-xs text-yellow-700 dark:text-yellow-300">
                  1. When you see phone number form, look for:
                  {'\n'}2. "Skip this with a test phone number" 
                  {'\n'}3. Click "Use test phone number"
                  {'\n'}4. DO NOT enter any real phone number!
                </Text>
              </View>

              <View className="space-y-1">
                <Text className="text-sm font-medium">📞 Phone Number:</Text>
                <Text className="text-sm font-mono bg-muted p-2 rounded">
                  000-000-0000 (Use SKIP option instead!)
                </Text>
              </View>
              
              <View className="space-y-1">
                <Text className="text-sm font-medium">📧 Email:</Text>
                <Text className="text-sm font-mono bg-muted p-2 rounded">
                  test@example.com
                </Text>
              </View>
              
              <View className="space-y-1">
                <Text className="text-sm font-medium">🆔 SSN/TIN:</Text>
                <Text className="text-sm font-mono bg-muted p-2 rounded">
                  000-00-0000
                </Text>
              </View>
              
              <View className="space-y-1">
                <Text className="text-sm font-medium">📅 Date of Birth:</Text>
                <Text className="text-sm font-mono bg-muted p-2 rounded">
                  01/01/1970
                </Text>
              </View>
              
              <View className="space-y-1">
                <Text className="text-sm font-medium">🏠 Address:</Text>
                <Text className="text-sm font-mono bg-muted p-2 rounded">
                  address_full_match
                </Text>
              </View>

              <View className="space-y-1">
                <Text className="text-sm font-medium">🏢 Business Name:</Text>
                <Text className="text-sm font-mono bg-muted p-2 rounded">
                  Test Business
                </Text>
              </View>

              <Text className="text-xs text-muted-foreground">
                ✅ Perfect for UK marketplace without needing UK phone number!
              </Text>
            </CardContent>
          </Card>

          {/* Test Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm font-mono bg-muted p-4 rounded">
                  {result}
                </Text>
              </CardContent>
            </Card>
          )}

          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>Current User</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground">
                ID: {user?.id || 'Not logged in'}
              </Text>
              <Text className="text-sm text-muted-foreground">
                Email: {user?.email || 'N/A'}
              </Text>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onPress={() => {
                  console.log('🧪 [Navigation] Going to Payment Setup page');
                  router.push('/provider-verification/payment');
                }}
                variant="outline"
                className="w-full"
              >
                <Text>Go to Payment Setup</Text>
              </Button>
              
              <Button 
                onPress={() => {
                  console.log('🧪 [Navigation] Going to Earnings page');
                  router.push('/provider/earnings');
                }}
                variant="outline"
                className="w-full"
              >
                <Text>Go to Earnings</Text>
              </Button>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}