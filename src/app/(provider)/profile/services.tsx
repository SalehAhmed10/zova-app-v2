import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

// ✅ Centralized validation system
import { serviceSchema, type ServiceFormData, hasFormErrors, getFormErrorCount } from '@/lib/validation';

// ✅ UI Components with proper theme colors
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ✅ React Query hooks for server state
import {
  useAuthOptimized,
  useProviderServices,
  useServiceCategories,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useToggleServiceStatus
} from '@/hooks';

// ✅ Theme and utilities
import { useColorScheme } from '@/lib/core/useColorScheme';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react-native';

// ✅ Service Card Component - Memoized for performance with detailed information
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
        "mb-4 border-l-4",
        service.isActive ? "border-l-green-500" : "border-l-gray-400"
      )}>
        <CardContent className="p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground mb-1">
                {String(service.title || 'Untitled Service')}
              </Text>
              <Text className="text-sm text-muted-foreground mb-2">
                {String(service.description || 'No description provided')}
              </Text>
              <View className="flex-row items-center gap-2 mb-2">
                <Badge variant={service.isActive ? "default" : "secondary"}>
                  <Text>{service.isActive ? 'Active' : 'Inactive'}</Text>
                </Badge>
                <Text className="text-sm text-muted-foreground">
                  {String(service.category || 'Uncategorized')}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onEdit(service)}
                className="w-8 h-8 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.info + '1A' }}
                disabled={isDeleting || isToggling}
              >
                <Ionicons name="pencil" size={16} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onToggle(service)}
                className="w-8 h-8 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.success + '1A' }}
                disabled={isDeleting || isToggling}
              >
                <Ionicons
                  name={service.isActive ? "eye-off" : "eye"}
                  size={16}
                  color={service.isActive ? colors.warning : colors.success}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete(service.id)}
                className="w-8 h-8 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.destructive + '1A' }}
                disabled={isDeleting || isToggling}
              >
                <Ionicons name="trash" size={16} color={colors.destructiveForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pricing Information */}
          <View className="bg-muted/30 rounded-lg p-3 mb-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-medium text-foreground">Base Price:</Text>
              <Text className="text-sm font-bold text-foreground">
                £{String(service.price || '0.00')}
              </Text>
            </View>
            {service.priceType === 'hourly' && (
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted-foreground">Per Hour</Text>
                <Text className="text-xs text-muted-foreground">Hourly Rate</Text>
              </View>
            )}
            {service.houseCallExtraFee && (
              <View className="flex-row justify-between items-center mt-1">
                <Text className="text-sm text-muted-foreground">House Call Fee:</Text>
                <Text className="text-sm text-foreground">+£{String(service.houseCallExtraFee)}</Text>
              </View>
            )}
          </View>

          {/* Additional Details */}
          <View className="gap-2">
            {service.depositPercentage && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted-foreground">Deposit Required:</Text>
                <Text className="text-sm text-foreground">{String(service.depositPercentage)}%</Text>
              </View>
            )}
            {service.cancellationPolicy && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted-foreground">Cancellation:</Text>
                <Text className="text-sm text-foreground">{String(service.cancellationPolicy)}</Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
});

export default function ServicesScreen() {
  const { user } = useAuthOptimized();
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

  const [activeTab, setActiveTab] = React.useState('list');
  const [editingService, setEditingService] = React.useState<any>(null);

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
    setValue('title', service.title || '');
    setValue('description', service.description || '');
    setValue('category', service.category_id || service.category || '');
    setValue('subcategory', service.subcategory_id || service.subcategory || '');
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

  // ✅ FORM VALIDATION: Check for errors
  const formErrors = hasFormErrors(errors);
  const errorCount = getFormErrorCount(errors);

  return (
    <SafeAreaView className="flex-1 bg-background">
   
      <View className="px-4 py-4 border-b border-border">
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
          <TabsList className="flex-row mx-4 mt-4">
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
            <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
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
                <View className="items-center justify-center py-12">
                  <View className="mb-4">
                    <Ionicons name="construct-outline" size={64} color={colors.mutedForeground} />
                  </View>
                  <Text className="text-xl font-bold text-foreground mb-2">No Services Yet</Text>
                  <Text className="text-muted-foreground text-center mb-6">
                    Create your first service to start accepting bookings
                  </Text>
                  <Button onPress={() => setActiveTab('form')}>
                    <Text className="text-primary-foreground font-medium">Add Your First Service</Text>
                  </Button>
                </View>
              )}
            </ScrollView>
          </TabsContent>

          <TabsContent value="form" className="flex-1">
            <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
              <Card>
                <CardHeader>
                  <CardTitle>Service Details</CardTitle>
                </CardHeader>
                <CardContent className="gap-4">
                  <View>
                    <Text className="text-sm font-medium mb-2">Service Title *</Text>
                    <Controller
                      control={control}
                      name="title"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value}
                          onChangeText={onChange}
                          placeholder="e.g., House Cleaning, Plumbing Service"
                          className={cn(errors.title && 'border-destructive')}
                        />
                      )}
                    />
                    {errors.title && (
                      <Text className="text-destructive text-xs mt-1">{errors.title.message}</Text>
                    )}
                  </View>

                  <View>
                    <Text className="text-sm font-medium mb-2">Description *</Text>
                    <Controller
                      control={control}
                      name="description"
                      render={({ field: { onChange, value } }) => (
                        <Textarea
                          value={value}
                          onChangeText={onChange}
                          placeholder="Describe what this service includes..."
                          className={cn("min-h-[80px]", errors.description && 'border-destructive')}
                        />
                      )}
                    />
                    {errors.description && (
                      <Text className="text-destructive text-xs mt-1">{errors.description.message}</Text>
                    )}
                  </View>

                  <View>
                    <Text className="text-sm font-medium mb-2">Category *</Text>
                    <Controller
                      control={control}
                      name="category"
                      render={({ field: { onChange, value } }) => (
                        <View className="border border-border rounded-lg">
                          {categoriesLoading ? (
                            <View className="p-3">
                              <Skeleton className="h-5 w-full" />
                            </View>
                          ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2">
                              <View className="flex-row gap-2">
                                {categories?.map((category) => (
                                  <TouchableOpacity
                                    key={category.id}
                                    onPress={() => onChange(category.id)}
                                    className={cn(
                                      "px-4 py-2 rounded-full border",
                                      value === category.id
                                        ? "bg-primary border-primary"
                                        : "bg-background border-border"
                                    )}
                                  >
                                    <Text className={cn(
                                      "text-sm font-medium",
                                      value === category.id
                                        ? "text-primary-foreground"
                                        : "text-foreground"
                                    )}>
                                      {category.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>
                          )}
                        </View>
                      )}
                    />
                    {errors.category && (
                      <Text className="text-destructive text-xs mt-1">{errors.category.message}</Text>
                    )}
                  </View>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="gap-4">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-medium mb-2">Base Price (£) *</Text>
                      <Controller
                        control={control}
                        name="price"
                        render={({ field: { onChange, value } }) => (
                          <Input
                            value={value}
                            onChangeText={onChange}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            className={cn(errors.price && 'border-destructive')}
                          />
                        )}
                      />
                      {errors.price && (
                        <Text className="text-destructive text-xs mt-1">{errors.price.message}</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium mb-2">Price Type</Text>
                      <Controller
                        control={control}
                        name="priceType"
                        render={({ field: { onChange, value } }) => (
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => onChange('fixed')}
                              className={cn(
                                "flex-1 py-3 rounded-lg border items-center",
                                value === 'fixed'
                                  ? "bg-primary border-primary"
                                  : "bg-background border-border"
                              )}
                            >
                              <Text className={cn(
                                "text-sm font-medium",
                                value === 'fixed'
                                  ? "text-primary-foreground"
                                  : "text-foreground"
                              )}>
                                Fixed
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => onChange('hourly')}
                              className={cn(
                                "flex-1 py-3 rounded-lg border items-center",
                                value === 'hourly'
                                  ? "bg-primary border-primary"
                                  : "bg-background border-border"
                              )}
                            >
                              <Text className={cn(
                                "text-sm font-medium",
                                value === 'hourly'
                                  ? "text-primary-foreground"
                                  : "text-foreground"
                              )}>
                                Hourly
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      />
                    </View>
                  </View>

                  <View>
                    <Text className="text-sm font-medium mb-2">Duration (minutes) *</Text>
                    <Controller
                      control={control}
                      name="duration"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value}
                          onChangeText={onChange}
                          placeholder="e.g., 60 for 1 hour"
                          keyboardType="decimal-pad"
                          className={cn(errors.duration && 'border-destructive')}
                        />
                      )}
                    />
                    {errors.duration && (
                      <Text className="text-destructive text-xs mt-1">{errors.duration.message}</Text>
                    )}
                  </View>

                  <View>
                    <Text className="text-sm font-medium mb-2">Deposit Percentage (Optional)</Text>
                    <Controller
                      control={control}
                      name="depositPercentage"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value}
                          onChangeText={onChange}
                          placeholder="e.g., 20 for 20%"
                          keyboardType="decimal-pad"
                        />
                      )}
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-medium mb-2">House Call Extra Fee (Optional)</Text>
                    <Controller
                      control={control}
                      name="houseCallExtraFee"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value}
                          onChangeText={onChange}
                          placeholder="Additional fee for house calls"
                          keyboardType="decimal-pad"
                        />
                      )}
                    />
                  </View>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Service Settings</CardTitle>
                </CardHeader>
                <CardContent className="gap-4">
                  <View>
                    <Text className="text-sm font-medium mb-2">Cancellation Policy</Text>
                    <Controller
                      control={control}
                      name="cancellationPolicy"
                      render={({ field: { onChange, value } }) => (
                        <Textarea
                          value={value}
                          onChangeText={onChange}
                          placeholder="Describe your cancellation policy..."
                          className="min-h-[60px]"
                        />
                      )}
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-medium">House Call Available</Text>
                      <Text className="text-xs text-muted-foreground">Offer this service at customer's location</Text>
                    </View>
                    <Controller
                      control={control}
                      name="houseCallAvailable"
                      render={({ field: { onChange, value } }) => (
                        <Switch
                          checked={value}
                          onCheckedChange={onChange}
                        />
                      )}
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-medium">Allow SOS Bookings</Text>
                      <Text className="text-xs text-muted-foreground">Accept urgent same-day bookings</Text>
                    </View>
                    <Controller
                      control={control}
                      name="allowsSosBooking"
                      render={({ field: { onChange, value } }) => (
                        <Switch
                          checked={value}
                          onCheckedChange={onChange}
                        />
                      )}
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-medium">Service Status</Text>
                      <Text className="text-xs text-muted-foreground">Make this service available for booking</Text>
                    </View>
                    <Controller
                      control={control}
                      name="isActive"
                      render={({ field: { onChange, value } }) => (
                        <Switch
                          checked={value}
                          onCheckedChange={onChange}
                        />
                      )}
                    />
                  </View>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-6 mb-8">
                <Button
                  variant="outline"
                  onPress={handleCancel}
                  className="flex-1"
                >
                  <Text className="text-foreground font-medium">Cancel</Text>
                </Button>
                <Button
                  onPress={handleSubmit(onSubmit)}
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  className="flex-1"
                >
                  <Text className="text-primary-foreground font-medium">
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