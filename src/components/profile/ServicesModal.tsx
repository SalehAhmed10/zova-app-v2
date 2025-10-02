import React from 'react';
import { View, ScrollView, Modal, Pressable, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
import { THEME } from '@/lib/core/theme';
import { cn } from '@/lib/utils';
import { useServicesModalStore } from '@/stores/ui/servicesModal';

interface ServicesModalProps {
  visible: boolean;
  onClose: () => void;
}

// ✅ Service Card Component - Memoized for performance with detailed information
const ServiceCard = React.memo(({ service, onEdit, onToggle, onDelete, isDeleting, isToggling }: {
  service: any;
  onEdit: (service: any) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isToggling: boolean;
}) => {
  // Add safety checks to prevent rendering invalid data
  if (!service || typeof service !== 'object') {
    console.warn('[ServiceCard] Invalid service object:', service);
    return null;
  }
  
  if (!service.id) {
    console.warn('[ServiceCard] Service missing id:', service);
    return null;
  }

  const { colorScheme } = useColorScheme();

  return (
    <Card className="mb-4 border-border bg-card">
      <CardContent className="p-5">
        {/* Header Row */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-4">
            <Text className="font-bold text-foreground text-lg mb-1">
              {String(service.title || 'Untitled Service')}
            </Text>
            {service.description && (
              <Text className="text-muted-foreground text-sm mb-2 leading-5">
                {String(service.description)}
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-3">
            <Badge variant={service.is_active ? 'default' : 'secondary'}>
              <Text className="text-xs font-medium">
                {service.is_active ? 'Active' : 'Inactive'}
              </Text>
            </Badge>
            <Switch
              checked={service.is_active}
              onCheckedChange={() => onToggle(service.id)}
              disabled={isToggling}
            />
          </View>
        </View>

        {/* Service Details */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-4">
            {/* Price */}
            <View className="flex-row items-center gap-1">
              <Ionicons name="cash-outline" size={16} color={THEME[colorScheme]?.primary || THEME.light.primary} />
              <Text className="font-semibold text-foreground text-base">
                ${typeof service.base_price === 'number' ? service.base_price : 0}
              </Text>
            </View>
            
            {/* Duration */}
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={16} color={THEME[colorScheme]?.primary || THEME.light.primary} />
              <Text className="text-muted-foreground text-sm">
                {typeof service.duration_minutes === 'number' ? service.duration_minutes : 0}min
              </Text>
            </View>

            {/* House Call Indicator */}
            {service.house_call_available && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="home-outline" size={16} color={THEME[colorScheme]?.primary || THEME.light.primary} />
                <Text className="text-muted-foreground text-xs">
                  House Call
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Category and Subcategory */}
        {(service.category_name || service.subcategory_name) && (
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="pricetag-outline" size={14} color={THEME[colorScheme]?.mutedForeground || THEME.light.mutedForeground} />
            <Text className="text-muted-foreground text-xs">
              {service.category_name && service.subcategory_name 
                ? `${String(service.category_name)} • ${String(service.subcategory_name)}`
                : String(service.category_name || service.subcategory_name)
              }
            </Text>
          </View>
        )}

        {/* Additional Service Info */}
        {service.deposit_percentage && service.deposit_percentage > 0 && (
          <View className="flex-row items-center gap-1 mb-3">
            <Ionicons name="card-outline" size={14} color={THEME[colorScheme]?.mutedForeground || THEME.light.mutedForeground} />
            <Text className="text-muted-foreground text-xs">
              {typeof service.deposit_percentage === 'number' ? service.deposit_percentage : 0}% deposit required
            </Text>
          </View>
        )}

        {/* House Call Fee */}
        {service.house_call_available && service.house_call_extra_fee && service.house_call_extra_fee > 0 && (
          <View className="flex-row items-center gap-1 mb-3">
            <Ionicons name="add-circle-outline" size={14} color={THEME[colorScheme]?.mutedForeground || THEME.light.mutedForeground} />
            <Text className="text-muted-foreground text-xs">
              +${typeof service.house_call_extra_fee === 'number' ? service.house_call_extra_fee : 0} house call fee
            </Text>
          </View>
        )}

        {/* SOS Booking */}
        {service.allows_sos_booking && (
          <View className="flex-row items-center gap-1 mb-3">
            <Ionicons name="flash-outline" size={14} color={THEME[colorScheme]?.primary || THEME.light.primary} />
            <Text className="text-primary text-xs font-medium">
              SOS Bookings Allowed
            </Text>
          </View>
        )}

        {/* Cancellation Policy */}
        {service.cancellation_policy && (
          <View className="flex-row items-start gap-1 mb-3">
            <Ionicons name="information-circle-outline" size={14} color={THEME[colorScheme]?.mutedForeground || THEME.light.mutedForeground} />
            <Text className="text-muted-foreground text-xs flex-1" numberOfLines={2}>
              {String(service.cancellation_policy)}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row justify-end gap-3 pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onPress={() => onEdit(service)}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="pencil" size={16} color={THEME[colorScheme]?.primary || THEME.light.primary} />
            <Text className="text-primary font-medium">Edit</Text>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isDeleting}
            className={cn(
              "flex-row items-center gap-2 border-destructive",
              isDeleting && "opacity-50"
            )}
            onPress={() => {
              Alert.alert(
                "Delete Service",
                `Are you sure you want to delete "${String(service.title || 'this service')}"? This action cannot be undone.`,
                [
                  {
                    text: "Cancel",
                    style: "cancel"
                  },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete(service.id)
                  }
                ]
              );
            }}
          >
            <Ionicons name="trash" size={16} color={THEME[colorScheme]?.destructive || THEME.light.destructive} />
            <Text className="text-destructive font-medium">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
});

export default function ServicesModal({ visible, onClose }: ServicesModalProps) {
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  // ✅ Tab state management
  const [activeTab, setActiveTab] = React.useState<'create' | 'manage'>('manage');

  // ✅ Zustand store for internal UI state (editing, toggling, etc.)
  const { 
    editingService,
    serviceBeingToggled,
    serviceBeingDeleted,
    openServiceModal,
    closeServiceModal,
    setServiceBeingToggled,
    setServiceBeingDeleted,
    _hasHydrated 
  } = useServicesModalStore();

  // ✅ React Query for server state - NO useState
  const { data: services = [], isLoading: servicesLoading, refetch } = useProviderServices(user?.id) as { data: any[], isLoading: boolean, refetch: () => void };
  console.log('[ServicesModal] Services data:', services);
  console.log('[ServicesModal] Services loading:', servicesLoading);
  console.log('[ServicesModal] Services length:', services?.length || 0);
  const { data: categories = [], isLoading: categoriesLoading } = useServiceCategories();
  
  // ✅ Use real data from Supabase - hooks should return active categories only
  const displayCategories = categories;
  const displayCategoriesLoading = categoriesLoading;
  
  // ✅ React Query mutations
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const toggleServiceMutation = useToggleServiceStatus();

  // ✅ React Hook Form with centralized Zod validation - NO useEffect
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isValid, isSubmitting }
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      category: '',
      subcategory: '',
      price: '',
      duration: '',
      priceType: 'fixed',
      description: '',
      isActive: true,
      depositPercentage: '20',
      cancellationPolicy: '',
      houseCallAvailable: false,
      houseCallExtraFee: '0',
      allowsSosBooking: false,
    }
  });

  // ✅ Watch form values for dependent fields - NO useEffect
  const watchedCategory = watch('category');

  // ✅ Get subcategories based on selected category - NO useEffect
  const selectedCategoryData = React.useMemo(() => {
    return displayCategories.find(cat => cat.id === watchedCategory);
  }, [displayCategories, watchedCategory]);

  // ✅ Form submission handler - NO useEffect
  const onSubmit = React.useCallback(async (data: ServiceFormData) => {
    console.log('🔥 onSubmit called with data:', data);
    if (!user?.id) {
      console.error('❌ No user ID');
      return;
    }

    try {
      const serviceData = {
        provider_id: user.id,
        title: data.title,
        subcategory_id: data.subcategory,
        base_price: parseFloat(data.price),
        duration_minutes: parseInt(data.duration),
        price_type: data.priceType,
        description: data.description || '',
        is_active: data.isActive,
        deposit_percentage: parseFloat(data.depositPercentage),
        cancellation_policy: data.cancellationPolicy || '',
        house_call_available: data.houseCallAvailable,
        house_call_extra_fee: parseFloat(data.houseCallExtraFee || '0'),
        requires_deposit: parseFloat(data.depositPercentage) > 0,
        allows_sos_booking: data.allowsSosBooking,
      };

      console.log('📤 Submitting service data:', serviceData);

      if (editingService) {
        console.log('✏️ Updating existing service');
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          ...serviceData
        });
      } else {
        console.log('➕ Creating new service');
        await createServiceMutation.mutateAsync(serviceData);
      }

      console.log('✅ Service operation completed successfully');
      
      // Reset form and close
      reset();
      closeServiceModal();
      setActiveTab('manage'); // Switch to manage tab after successful creation/update
      refetch();
    } catch (error) {
      console.error('❌ Failed to save service:', error);
    }
  }, [user?.id, editingService, updateServiceMutation, createServiceMutation, reset, closeServiceModal, refetch]);

  // ✅ Handle service editing - NO useEffect
  const handleEditService = React.useCallback((service: any) => {
    openServiceModal(service);
    setActiveTab('create'); // Switch to create tab when editing
    
    // Populate form with existing data
    reset({
      title: service.title || '',
      category: service.category_id || '',
      subcategory: service.subcategory_id || '',
      price: service.base_price?.toString() || '',
      duration: service.duration_minutes?.toString() || '',
      priceType: service.price_type || 'fixed',
      description: service.description || '',
      isActive: service.is_active ?? true,
      depositPercentage: service.deposit_percentage?.toString() || '20',
      cancellationPolicy: service.cancellation_policy || '',
      houseCallAvailable: service.house_call_available ?? false,
      houseCallExtraFee: service.house_call_extra_fee?.toString() || '0',
      allowsSosBooking: service.allows_sos_booking ?? false,
    });
  }, [openServiceModal, reset]);

  // ✅ Handle service deletion
  const handleDeleteService = React.useCallback(async (serviceId: string) => {
    if (!user?.id) return;
    try {
      setServiceBeingDeleted(serviceId); // Track which service is being deleted
      await deleteServiceMutation.mutateAsync(serviceId);
      refetch();
    } catch (error) {
      console.error('Failed to delete service:', error);
    } finally {
      setServiceBeingDeleted(null); // Clear the deleting state
    }
  }, [deleteServiceMutation, refetch, user?.id, setServiceBeingDeleted]);

  // ✅ Handle service status toggle
  const handleToggleService = React.useCallback(async (serviceId: string) => {
    if (!user?.id) return;
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    try {
      setServiceBeingToggled(serviceId); // Track which service is being toggled
      await toggleServiceMutation.mutateAsync({
        id: serviceId,
        is_active: !service.is_active
      });
      refetch();
    } catch (error) {
      console.error('Failed to toggle service status:', error);
    } finally {
      setServiceBeingToggled(null); // Clear the toggling state
    }
  }, [toggleServiceMutation, refetch, user?.id, services, setServiceBeingToggled]);

  // ✅ Handle modal close
  const handleClose = React.useCallback(() => {
    reset();
    closeServiceModal();
    setActiveTab('manage'); // Reset to manage tab (default)
    onClose();
  }, [reset, closeServiceModal, onClose]);

  // ✅ Wait for Zustand hydration
  if (!_hasHydrated) {
    return null;
  }
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <TouchableOpacity onPress={handleClose}>
            <Ionicons
              name="close"
              size={24}
              color={colorScheme === 'dark' ? THEME.dark.foreground : THEME.light.foreground}
            />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">
            {editingService ? 'Edit Service' : 'Manage Services'}
          </Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1">
          <View className="p-6">
            {/* Header Section */}
            <Animated.View
              entering={FadeIn.delay(200).springify()}
              className="items-center mb-8"
            >
              <View className="w-16 h-16 bg-primary rounded-2xl justify-center items-center mb-4">
                <Text className="text-2xl">🛠️</Text>
              </View>
              <Text className="text-2xl font-bold text-foreground mb-2">
                {editingService ? 'Edit Service' : 'Manage Services'}
              </Text>
              <Text className="text-muted-foreground text-center">
                {editingService
                  ? 'Update your service details and pricing'
                  : 'Create and manage your service offerings'
                }
              </Text>
            </Animated.View>

            {/* Tabs Navigation */}
            <Animated.View entering={SlideInDown.delay(300).springify()} className="mb-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'manage')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create">
                    <Ionicons name="add-circle-outline" size={16} color={THEME[colorScheme].foreground} />
                    <Text className="ml-2">{editingService ? 'Edit Service' : 'Create Service'}</Text>
                  </TabsTrigger>
                  <TabsTrigger value="manage">
                    <Ionicons name="list-outline" size={16} color={THEME[colorScheme].foreground} />
                    <Text className="ml-2">Manage Services</Text>
                  </TabsTrigger>
                </TabsList>

                {/* Create/Edit Service Tab */}
                <TabsContent value="create" className="mt-6">
                  <Animated.View entering={SlideInDown.delay(400).springify()}>
                    <Card>
                      <CardHeader>
                        <CardTitle>{editingService ? 'Edit Service Details' : 'Create New Service'}</CardTitle>
                      </CardHeader>
                      <CardContent>

                        <View className="gap-4">
                          {/* Service Name */}
                          <Controller
                            control={control}
                            name="title"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                              <View>
                                <Text className="text-foreground font-medium mb-2">
                                  Service Name <Text className="text-destructive">*</Text>
                                </Text>
                                <Input
                                  placeholder="e.g., Hair Styling"
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  className={error ? "border-destructive" : ""}
                                />
                                {error && (
                                  <Text className="text-destructive text-xs mt-1">{error.message}</Text>
                                )}
                              </View>
                            )}
                          />

                          {/* Category Selection */}
                          {!displayCategoriesLoading && displayCategories.length > 0 && (
                            <Controller
                              control={control}
                              name="category"
                              render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <View>
                                  <Text className="text-foreground font-medium mb-2">
                                    Category <Text className="text-destructive">*</Text>
                                  </Text>
                                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                      {displayCategories.map((category) => (
                                        <Button
                                          key={category.id}
                                          variant={value === category.id ? "default" : "outline"}
                                          onPress={() => {
                                            onChange(category.id);
                                            // Reset subcategory when category changes
                                            const firstSubcategory = category.service_subcategories?.[0];
                                            if (firstSubcategory) {
                                              setValue('subcategory', firstSubcategory.id);
                                            }
                                          }}
                                        >
                                          <Text>{category.name}</Text>
                                        </Button>
                                      ))}
                                    </View>
                                  </ScrollView>
                                  {error && (
                                    <Text className="text-destructive text-xs mt-1">{error.message}</Text>
                                  )}
                                </View>
                              )}
                            />
                          )}

                          {/* Subcategory Selection */}
                          {selectedCategoryData?.service_subcategories && (
                            <Controller
                              control={control}
                              name="subcategory"
                              render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <View>
                                  <Text className="text-foreground font-medium mb-2">
                                    Subcategory <Text className="text-destructive">*</Text>
                                  </Text>
                                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                      {selectedCategoryData.service_subcategories.map((subcategory) => (
                                        <Button
                                          key={subcategory.id}
                                          variant={value === subcategory.id ? "default" : "outline"}
                                          onPress={() => onChange(subcategory.id)}
                                        >
                                          <Text>{subcategory.name}</Text>
                                        </Button>
                                      ))}
                                    </View>
                                  </ScrollView>
                                  {error && (
                                    <Text className="text-destructive text-xs mt-1">{error.message}</Text>
                                  )}
                                </View>
                              )}
                            />
                          )}

                          {/* Price */}
                          <Controller
                            control={control}
                            name="price"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                              <View>
                                <Text className="text-foreground font-medium mb-2">
                                  Price ($) <Text className="text-destructive">*</Text>
                                </Text>
                                <Input
                                  placeholder="85"
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  keyboardType="numeric"
                                  className={error ? "border-destructive" : ""}
                                />
                                {error && (
                                  <Text className="text-destructive text-xs mt-1">{error.message}</Text>
                                )}
                              </View>
                            )}
                          />

                          {/* Duration */}
                          <Controller
                            control={control}
                            name="duration"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                              <View>
                                <Text className="text-foreground font-medium mb-2">
                                  Duration (minutes) <Text className="text-destructive">*</Text>
                                </Text>
                                <Input
                                  placeholder="60"
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  keyboardType="numeric"
                                  className={error ? "border-destructive" : ""}
                                />
                                {error && (
                                  <Text className="text-destructive text-xs mt-1">{error.message}</Text>
                                )}
                              </View>
                            )}
                          />

                          {/* Description */}
                          <Controller
                            control={control}
                            name="description"
                            render={({ field: { onChange, onBlur, value } }) => (
                              <View>
                                <Text className="text-foreground font-medium mb-2">
                                  Description (Optional)
                                </Text>
                                <Textarea
                                  placeholder="Describe your service..."
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  className="min-h-20"
                                />
                              </View>
                            )}
                          />

                          {/* Deposit Percentage */}
                          <Controller
                            control={control}
                            name="depositPercentage"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                              <View>
                                <Text className="text-foreground font-medium mb-2">
                                  Deposit Percentage (%) <Text className="text-destructive">*</Text>
                                </Text>
                                <Input
                                  placeholder="20"
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  keyboardType="numeric"
                                  className={error ? "border-destructive" : ""}
                                />
                                <Text className="text-muted-foreground text-xs mt-1">
                                  Percentage of service price required as deposit (0-100)
                                </Text>
                                {error && (
                                  <Text className="text-destructive text-xs mt-1">{error.message}</Text>
                                )}
                              </View>
                            )}
                          />

                          {/* Cancellation Policy */}
                          <Controller
                            control={control}
                            name="cancellationPolicy"
                            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                              <View>
                                <Text className="text-foreground font-medium mb-2">
                                  Cancellation Policy (Optional)
                                </Text>
                                <Textarea
                                  placeholder="e.g., Free cancellation up to 24 hours before appointment. 50% fee within 24 hours, 100% fee for no-shows."
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                  className="min-h-16"
                                />
                                <Text className="text-muted-foreground text-xs mt-1">
                                  Define your cancellation and no-show policies
                                </Text>
                                {error && (
                                  <Text className="text-destructive text-xs mt-1">{error.message}</Text>
                                )}
                              </View>
                            )}
                          />

                          {/* House Call Available */}
                          <Controller
                            control={control}
                            name="houseCallAvailable"
                            render={({ field: { onChange, value } }) => (
                              <View className="flex-row items-center justify-between py-3">
                                <View className="flex-1">
                                  <Text className="text-foreground font-medium">
                                    House Calls Available
                                  </Text>
                                  <Text className="text-muted-foreground text-sm">
                                    Offer this service at customer's location
                                  </Text>
                                </View>
                                <Switch
                                  checked={value}
                                  onCheckedChange={onChange}
                                />
                              </View>
                            )}
                          />

                          {/* House Call Extra Fee - Conditional */}
                          {watch('houseCallAvailable') && (
                            <Controller
                              control={control}
                              name="houseCallExtraFee"
                              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                                <View>
                                  <Text className="text-foreground font-medium mb-2">
                                    House Call Extra Fee ($) <Text className="text-destructive">*</Text>
                                  </Text>
                                  <Input
                                    placeholder="15"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    keyboardType="numeric"
                                    className={error ? "border-destructive" : ""}
                                  />
                                  <Text className="text-muted-foreground text-xs mt-1">
                                    Additional fee for house call services
                                  </Text>
                                  {error && (
                                    <Text className="text-destructive text-xs mt-1">{error.message}</Text>
                                  )}
                                </View>
                              )}
                            />
                          )}

                          {/* Allows SOS Booking */}
                          <Controller
                            control={control}
                            name="allowsSosBooking"
                            render={({ field: { onChange, value } }) => (
                              <View className="flex-row items-center justify-between py-3">
                                <View className="flex-1">
                                  <Text className="text-foreground font-medium">
                                    Allow SOS Bookings
                                  </Text>
                                  <Text className="text-muted-foreground text-sm">
                                    Accept urgent/emergency booking requests
                                  </Text>
                                </View>
                                <Switch
                                  checked={value}
                                  onCheckedChange={onChange}
                                />
                              </View>
                            )}
                          />
                        </View>

                        {/* Form Status */}
                        {hasFormErrors(errors) && (
                          <View className="mt-4 p-3 bg-destructive/10 rounded-lg">
                            <Text className="text-destructive text-sm">
                              Please fix {getFormErrorCount(errors)} validation error(s) above
                            </Text>
                          </View>
                        )}

                        {/* Form Actions */}
                        <View className="flex-row gap-3 mt-6">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onPress={() => {
                              reset();
                              closeServiceModal();
                              setActiveTab('manage');
                            }}
                          >
                            <Text className="text-muted-foreground">Cancel</Text>
                          </Button>
                          
                          <Button
                            variant="default"
                            className="flex-1"
                            onPress={handleSubmit(onSubmit)}
                            disabled={!isValid || isSubmitting || createServiceMutation.isPending || updateServiceMutation.isPending}
                          >
                            <Text className="text-white font-medium">
                              {isSubmitting || createServiceMutation.isPending || updateServiceMutation.isPending
                                ? (editingService ? 'Updating...' : 'Creating...')
                                : (editingService ? 'Update Service' : 'Create Service')
                              }
                            </Text>
                          </Button>
                        </View>
                      </CardContent>
                    </Card>
                  </Animated.View>
                </TabsContent>

                {/* Manage Services Tab */}
                <TabsContent value="manage" className="mt-6">
                  <Animated.View entering={SlideInDown.delay(400).springify()}>
                    {servicesLoading ? (
                      <View className="gap-4">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="border-border bg-card">
                            <CardContent className="p-5">
                              <View className="flex-row items-start justify-between mb-4">
                                <View className="flex-1">
                                  <Skeleton className="w-40 h-5 mb-2 bg-muted" />
                                  <Skeleton className="w-64 h-4 mb-3 bg-muted" />
                                </View>
                                <Skeleton className="w-10 h-6 bg-muted" />
                              </View>
                              <View className="flex-row items-center gap-4 mb-4">
                                <Skeleton className="w-12 h-4 bg-muted" />
                                <Skeleton className="w-16 h-4 bg-muted" />
                                <Skeleton className="w-20 h-6 bg-muted" />
                              </View>
                              <View className="flex-row justify-end gap-3 pt-3 border-t border-border">
                                <Skeleton className="w-16 h-8 bg-muted" />
                                <Skeleton className="w-20 h-8 bg-muted" />
                              </View>
                            </CardContent>
                          </Card>
                        ))}
                      </View>
                    ) : services.length > 0 ? (
                      <View className="mb-6">
                        <View className="flex-row items-center justify-between mb-4">
                          <Text className="text-lg font-semibold text-foreground">
                            Your Services ({services.length})
                          </Text>
                          <Button
                            variant="outline"
                            onPress={() => {
                              setActiveTab('create');
                              openServiceModal();
                            }}
                            className="flex-row items-center gap-2"
                          >
                            <Ionicons name="add" size={16} color={THEME[colorScheme].primary} />
                            <Text className="text-primary font-medium">Add Service</Text>
                          </Button>
                        </View>

                        <View className="gap-4">
                          {services.map((service) => (
                            <ServiceCard
                              key={service.id}
                              service={service}
                              onEdit={handleEditService}
                              onToggle={handleToggleService}
                              onDelete={handleDeleteService}
                              isDeleting={serviceBeingDeleted === service.id}
                              isToggling={serviceBeingToggled === service.id}
                            />
                          ))}
                        </View>
                      </View>
                    ) : (
                      /* Empty State */
                      <View>
                        <Card className="border-border bg-card">
                          <CardContent className="p-6 items-center">
                            <Ionicons name="briefcase-outline" size={48} color={THEME[colorScheme].mutedForeground} />
                            <Text className="text-muted-foreground text-center mb-2 mt-3 text-lg font-medium">
                              No services yet
                            </Text>
                            <Text className="text-muted-foreground text-center mb-6 text-sm">
                              Create your first service to start accepting bookings from customers.
                            </Text>
                            <Button
                              onPress={() => {
                                setActiveTab('create');
                                openServiceModal();
                              }}
                              className="flex-row items-center gap-2"
                            >
                              <Ionicons name="add" size={16} color="white" />
                              <Text className="text-white font-medium">Create Your First Service</Text>
                            </Button>
                          </CardContent>
                        </Card>
                      </View>
                    )}
                  </Animated.View>
                </TabsContent>
              </Tabs>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}