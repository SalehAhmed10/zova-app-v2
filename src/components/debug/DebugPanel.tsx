import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/core/supabase';

interface DebugPanelProps {
  providerId: string;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ providerId, onClose }) => {
  const [debugInfo, setDebugInfo] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const runDebugCheck = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Debug: Starting comprehensive check...');

      // Check Supabase connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      // Check if provider exists
      const { data: providerData, error: providerError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', providerId)
        .single();

      // Check provider services
      const { data: servicesData, error: servicesError } = await supabase
        .from('provider_services')
        .select('count')
        .eq('provider_id', providerId);

      // Check reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('count')
        .eq('provider_id', providerId);

      setDebugInfo({
        connection: {
          success: !connectionError,
          error: connectionError?.message
        },
        provider: {
          exists: !!providerData,
          data: providerData,
          error: providerError?.message
        },
        services: {
          count: servicesData?.[0]?.count || 0,
          error: servicesError?.message
        },
        reviews: {
          count: reviewsData?.[0]?.count || 0,
          error: reviewsError?.message
        }
      });

      console.log('🔍 Debug results:', {
        connection: !connectionError,
        providerExists: !!providerData,
        servicesCount: servicesData?.[0]?.count || 0,
        reviewsCount: reviewsData?.[0]?.count || 0
      });

    } catch (error) {
      console.error('❌ Debug check failed:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ PURE: Initialize debug check on render (replaces useEffect)
  React.useMemo(() => {
    runDebugCheck();
  }, []);

  return (
    <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 z-50">
      <View className="flex-1 justify-center items-center p-4">
        <Card className="w-full max-w-md bg-card">
          <CardContent className="p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-foreground">Debug Panel</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <Text className="text-muted-foreground">Running diagnostics...</Text>
            ) : debugInfo ? (
              <View className="gap-3">
                <View>
                  <Text className="font-medium text-foreground">Supabase Connection:</Text>
                  <Text className={debugInfo.connection?.success ? "text-green-600" : "text-red-600"}>
                    {debugInfo.connection?.success ? "✅ Connected" : "❌ Failed"}
                  </Text>
                  {debugInfo.connection?.error && (
                    <Text className="text-xs text-red-600">{debugInfo.connection.error}</Text>
                  )}
                </View>

                <View>
                  <Text className="font-medium text-foreground">Provider Exists:</Text>
                  <Text className={debugInfo.provider?.exists ? "text-green-600" : "text-red-600"}>
                    {debugInfo.provider?.exists ? "✅ Found" : "❌ Not Found"}
                  </Text>
                  {debugInfo.provider?.data && (
                    <Text className="text-xs text-muted-foreground">
                      {debugInfo.provider.data.first_name} {debugInfo.provider.data.last_name} ({debugInfo.provider.data.role})
                    </Text>
                  )}
                  {debugInfo.provider?.error && (
                    <Text className="text-xs text-red-600">{debugInfo.provider.error}</Text>
                  )}
                </View>

                <View>
                  <Text className="font-medium text-foreground">Services Count:</Text>
                  <Text className="text-muted-foreground">{debugInfo.services?.count || 0}</Text>
                </View>

                <View>
                  <Text className="font-medium text-foreground">Reviews Count:</Text>
                  <Text className="text-muted-foreground">{debugInfo.reviews?.count || 0}</Text>
                </View>
              </View>
            ) : (
              <Text className="text-muted-foreground">No debug information available</Text>
            )}

            <View className="flex-row gap-2 mt-6">
              <Button onPress={runDebugCheck} className="flex-1" disabled={isLoading}>
                <Text className="text-primary-foreground font-medium">
                  {isLoading ? 'Testing...' : 'Run Again'}
                </Text>
              </Button>
              <Button onPress={onClose} variant="outline" className="flex-1">
                <Text className="text-foreground font-medium">Close</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  );
};