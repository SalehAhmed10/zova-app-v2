import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeIn } from 'react-native-reanimated';

// ✅ Centralized validation system
import { serviceSchema, type ServiceFormData } from '@/lib/validation';

// ✅ UI Components with proper theme colors
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ✅ Form Sections
import {
  ServiceDetailsSection,
  PricingSection,
  ServiceSettingsSection
} from '@/components/provider/service-form-sections';

// ✅ React Query hooks for server state
import {
  useProviderServices,
  useServiceCategories,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useToggleServiceStatus
} from '@/hooks';
import { useServiceSubcategories } from '@/hooks/provider';
import { useAuthStore } from '@/stores/auth';

// ✅ Theme and utilities
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

// ✅ Service Card Component - Enhanced UI with better visual hierarchy
const ServiceCard = React.memo(({ service, onEdit, onToggle, onDelete, isDeleting, isToggling }: {
  service: any;
  onEdit: (service: any) => void;
  onToggle: (service: any) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isToggling: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const colors = THEME[colorScheme];

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Card className={cn(
        "mb-4 border-l-4 mx-1 overflow-hidden",
        service.isActive ? "border-l-green-500 bg-card" : "border-l-amber-400 bg-card/50"
      )}>
        {/* Header Section - Title & Actions */}
        <View className="px-4 py-3 border-b border-border/40">
          {/* Title and Category Row */}
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-lg font-bold text-foreground flex-1 leading-6">
              {String(service.title || 'Untitled Service')}
            </Text>
            {/* Action Buttons - Clean with Borders */}
            <View className="flex-row gap-2 ml-3">
              {/* Edit Button */}
              <TouchableOpacity
                onPress={() => onEdit(service)}
                className="w-10 h-10 items-center justify-center rounded-lg border-2 border-primary"
                disabled={isDeleting || isToggling}
              >
                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
              </TouchableOpacity>

              {/* Toggle Button */}
              <TouchableOpacity
                onPress={() => onToggle(service)}
                className="w-10 h-10 items-center justify-center rounded-lg border-2"
                style={{
                  borderColor: service.isActive ? colors.warning : colors.success,
                }}
                disabled={isDeleting || isToggling}
              >
                <Ionicons
                  name={service.isActive ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={service.isActive ? colors.warning : colors.success}
                />
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => onDelete(service.id)}
                className="w-10 h-10 items-center justify-center rounded-lg border-2 border-destructive"
                disabled={isDeleting || isToggling}
              >
                <Ionicons name="trash-outline" size={20} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Badge and Category Row */}
          <View className="flex-row items-center gap-2">
            <Badge variant={service.isActive ? "default" : "outline"}>
              <Text className="text-xs font-medium">
                {service.isActive ? '✓ Active' : '⊘ Inactive'}
              </Text>
            </Badge>
            <Text className="text-xs text-muted-foreground flex-1">
              {String(service.category || 'Uncategorized')}
            </Text>
          </View>
        </View>

        {/* Content Section */}
        <CardContent className="px-4 py-3 gap-3">
          {/* Description */}
          {service.description && (
            <View>
              <Text className="text-xs font-medium text-muted-foreground mb-1">DESCRIPTION</Text>
              <Text className="text-sm text-foreground leading-5">
                {String(service.description)}
              </Text>
            </View>
          )}

          {/* Pricing Card */}
          <View className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold text-primary uppercase">Pricing</Text>
              <Text className="text-lg font-bold text-primary">
                £{String(service.price || '0.00')}
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">
                  {service.priceType === 'hourly' ? 'Per Hour' : 'Fixed Price'}
                </Text>
                {service.duration && (
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Duration: {service.duration} min
                  </Text>
                )}
              </View>
              {service.houseCallExtraFee && (
                <View className="items-end">
                  <Text className="text-xs text-muted-foreground">House Call</Text>
                  <Text className="text-xs font-semibold text-foreground">+£{String(service.houseCallExtraFee)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Additional Details Grid */}
          <View className="gap-2">
            <View className="flex-row justify-between items-center">
              {service.depositPercentage !== null && service.depositPercentage !== 0 ? (
                <>
                  <View className="flex-row items-center gap-2">
                    <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <Text className="text-xs font-medium text-foreground">Deposit</Text>
                  </View>
                  <Badge variant="outline">
                    <Text className="text-xs">{String(service.depositPercentage)}%</Text>
                  </Badge>
                </>
              ) : (
                <>
                  <View className="flex-row items-center gap-2">
                    <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <Text className="text-xs font-medium text-foreground">No Deposit</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">Required</Text>
                </>
              )}
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <Text className="text-xs font-medium text-foreground">House Calls</Text>
              </View>
              <Text className="text-xs text-muted-foreground">
                {service.houseCallAvailable ? '✓ Enabled' : '✗ Disabled'}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <Text className="text-xs font-medium text-foreground">SOS Bookings</Text>
              </View>
              <Text className="text-xs text-muted-foreground">
                {service.allowsSosBooking ? '✓ Enabled' : '✗ Disabled'}
              </Text>
            </View>
          </View>

          {/* Cancellation Policy */}
          {service.cancellationPolicy && (
            <View className="bg-muted/40 rounded-lg p-2.5 border border-muted/60">
              <Text className="text-xs font-semibold text-foreground mb-1">Cancellation Policy</Text>
              <Text className="text-xs text-muted-foreground leading-4">
                {String(service.cancellationPolicy)}
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
    </Animated.View>
  );
});

export default function ServicesScreen() {
  const user = useAuthStore((state) => state.user);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const colors = THEME[colorScheme];
  const insets = useSafeAreaInsets();

  // ✅ REACT QUERY: Server state management
  const { data: rawServices, isLoading: servicesLoading, refetch: refetchServices } = useProviderServices(user?.id);

  // Transform data to match validation schema (camelCase)
  const services = React.useMemo(() => {
    return rawServices?.map(service => ({
      id: service.id,
      title: String(service.title || ''),
      description: String(service.description || ''),
      category: String(service.category_name || 'Uncategorized'),
      subcategory: String(service.subcategory_name || ''),
      price: service.base_price || 0,
      duration: service.duration_minutes || 60,
      priceType: String(service.price_type || 'fixed'),
      isActive: Boolean(service.is_active),
      depositPercentage: service.deposit_percentage || null,
      houseCallExtraFee: service.house_call_extra_fee || null,
      cancellationPolicy: String(service.cancellation_policy || ''),
      houseCallAvailable: Boolean(service.house_call_available),
      allowsSosBooking: Boolean(service.allows_sos_booking),
    })) || [];
  }, [rawServices]);

  // ✅ REACT QUERY: Service categories
  const { data: categories, isLoading: categoriesLoading } = useServiceCategories();

  // ✅ REACT QUERY: Mutations for CRUD operations
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const toggleServiceMutation = useToggleServiceStatus();

  // ✅ FORM STATE: React Hook Form with Zod validation
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      subcategory: '',
      price: '',
      duration: '',
      priceType: 'fixed',
      isActive: true,
      depositPercentage: '',
      cancellationPolicy: '',
      houseCallAvailable: false,
      houseCallExtraFee: '',
      allowsSosBooking: false,
    }
  });

  // Get form values to watch category changes
  const categoryValue = watch('category');

  // ✅ REACT QUERY: Subcategories for selected category
  const { data: subcategories, isLoading: subcategoriesLoading } = useServiceSubcategories(categoryValue);

  const [activeTab, setActiveTab] = React.useState('list');
  const [editingService, setEditingService] = React.useState<any>(null);

  // Helper to get category ID from service data
  const getCategoryIdForService = (service: any) => {
    // If we have category_id, use it
    if (service.category_id) return service.category_id;
    // Otherwise, find category ID from the categories list by matching the service's subcategory
    if (service.subcategory_id && categories) {
      const foundCategory = categories.find(cat =>
        cat.service_subcategories?.some((sub: any) => sub.id === service.subcategory_id)
      );
      return foundCategory?.id;
    }
    return '';
  };

  // ✅ FORM HANDLERS: Create and update services
  const onSubmit = async (data: ServiceFormData) => {
    try {
      // Transform camelCase form data to snake_case for database
      const transformedData = {
        subcategory_id: data.subcategory,
        title: data.title,
        description: data.description,
        base_price: parseFloat(data.price) || 0,
        duration_minutes: parseFloat(data.duration) || 60,
        price_type: data.priceType,
        is_active: data.isActive,
        deposit_percentage: data.depositPercentage ? parseFloat(data.depositPercentage) : undefined,
        cancellation_policy: data.cancellationPolicy,
        house_call_available: data.houseCallAvailable,
        house_call_extra_fee: data.houseCallExtraFee ? parseFloat(data.houseCallExtraFee) : undefined,
        allows_sos_booking: data.allowsSosBooking,
      };

      if (editingService) {
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          provider_id: user?.id,
          ...transformedData,
        });
      } else {
        await createServiceMutation.mutateAsync({
          provider_id: user?.id,
          ...transformedData,
        });
      }

      reset();
      setEditingService(null);
      setActiveTab('list');
      refetchServices();
    } catch (error) {
      console.error('Failed to save service:', error);
      Alert.alert('Error', 'Failed to save service. Please try again.');
    }
  };

  // ✅ SERVICE MANAGEMENT: Edit, delete, and toggle status
  const handleEdit = (service: any) => {
    setEditingService(service);
    
    // Get the category ID for this service
    const categoryId = getCategoryIdForService(service);
    
    // Set all form values including category and subcategory
    setValue('title', service.title || '');
    setValue('description', service.description || '');
    setValue('category', categoryId || '');
    setValue('subcategory', service.subcategory_id || '');
    setValue('price', service.base_price?.toString() || service.price?.toString() || '');
    setValue('duration', service.duration_minutes?.toString() || service.duration?.toString() || '');
    setValue('priceType', service.price_type || service.priceType || 'fixed');
    setValue('depositPercentage', service.deposit_percentage?.toString() || service.depositPercentage?.toString() || '');
    setValue('houseCallExtraFee', service.house_call_extra_fee?.toString() || service.houseCallExtraFee?.toString() || '');
    setValue('cancellationPolicy', service.cancellation_policy || service.cancellationPolicy || '');
    setValue('houseCallAvailable', service.house_call_available ?? service.houseCallAvailable ?? false);
    setValue('allowsSosBooking', service.allows_sos_booking ?? service.allowsSosBooking ?? false);
    setValue('isActive', service.is_active ?? service.isActive ?? true);
    
    setActiveTab('form');
  };

  const handleDelete = (serviceId: string) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteServiceMutation.mutateAsync({ 
                id: serviceId, 
                provider_id: user?.id 
              });
              refetchServices();
            } catch (error) {
              console.error('Failed to delete service:', error);
              Alert.alert('Error', 'Failed to delete service. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (service: any) => {
    try {
      // Toggle the current active state
      const newActiveState = !service.isActive;
      await toggleServiceMutation.mutateAsync({ 
        id: service.id, 
        provider_id: user?.id,
        is_active: newActiveState
      });
      refetchServices();
    } catch (error) {
      console.error('Failed to toggle service status:', error);
      Alert.alert('Error', 'Failed to update service status. Please try again.');
    }
  };

  const handleCancel = () => {
    reset();
    setEditingService(null);
    setActiveTab('list');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
   
      <View className="px-2 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(provider)/profile')}
            className="w-8 h-8 p-0"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Button>
          <Text className="text-xl font-bold text-foreground">
            Services & Pricing
          </Text>
          <View className="w-8" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        className="flex-1"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="flex-row mx-2 mt-3">
            <TabsTrigger value="list" className="flex-1">
              <Text className="text-sm font-medium">My Services</Text>
            </TabsTrigger>
            <TabsTrigger value="form" className="flex-1">
              <Text className="text-sm font-medium">
                {editingService ? 'Edit Service' : 'Add Service'}
              </Text>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1">
            <ScrollView className="flex-1 px-2 pt-3" showsVerticalScrollIndicator={false}>
              {servicesLoading ? (
                <View className="gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </View>
              ) : services && services.length > 0 ? (
                <View className="gap-0">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onEdit={handleEdit}
                      onToggle={handleToggleStatus}
                      onDelete={handleDelete}
                      isDeleting={deleteServiceMutation.isPending}
                      isToggling={toggleServiceMutation.isPending}
                    />
                  ))}
                </View>
              ) : (
                <View className="flex-1 items-center justify-center py-16 px-6">
                  <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
                    <Ionicons name="briefcase-outline" size={48} color={colors.primary} />
                  </View>
                  <Text className="text-2xl font-bold text-foreground mb-3 text-center">
                    No Services Yet
                  </Text>
                  <Text className="text-base text-muted-foreground text-center mb-8 leading-6">
                    Get started by creating your first service to begin accepting customer bookings
                  </Text>
                  <Button 
                    onPress={() => setActiveTab('form')}
                    className="w-full max-w-xs"
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.primaryForeground} />
                    <Text className="text-primary-foreground font-semibold ml-2">Create First Service</Text>
                  </Button>
                </View>
              )}
            </ScrollView>
          </TabsContent>

          <TabsContent value="form" className="flex-1">
            <ScrollView 
              className="flex-1 px-2 pt-2" 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 48 }}
            >
              {/* Form Sections */}
              <ServiceDetailsSection 
                control={control}
                errors={errors}
                categories={categories}
                categoriesLoading={categoriesLoading}
                subcategories={subcategories}
                subcategoriesLoading={subcategoriesLoading}
              />

              <PricingSection 
                control={control}
                errors={errors}
              />

              <ServiceSettingsSection 
                control={control}
                errors={errors}
              />

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-8 mb-4">
                <Button
                  variant="outline"
                  onPress={handleCancel}
                  className="flex-1"
                >
                  <Text className="text-foreground font-semibold">Cancel</Text>
                </Button>
                <Button
                  onPress={handleSubmit(onSubmit)}
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  className="flex-1"
                >
                  <Text className="text-primary-foreground font-semibold">
                    {createServiceMutation.isPending || updateServiceMutation.isPending
                      ? 'Saving...'
                      : editingService ? 'Update Service' : 'Create Service'
                    }
                  </Text>
                </Button>
              </View>
            </ScrollView>
          </TabsContent>
        </Tabs>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}