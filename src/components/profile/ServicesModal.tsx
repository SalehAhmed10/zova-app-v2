// ✅ ZOVA Services Modal - Following copilot-rules.md
// ❌ NO useEffect patterns 
// ✅ React Query + Zustand architecture
// ✅ React Hook Form + Zod validation
// ✅ Theme colors only - no hardcoded colors

import React from 'react';
import { View, ScrollView, Modal, Pressable, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// ✅ Centralized validation system
import { serviceSchema, type ServiceFormData, hasFormErrors, getFormErrorCount } from '@/lib/validation';

// ✅ UI Components with proper theme colors
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

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
import { cn } from '@/lib/core/utils';
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
  if (!service?.id) return null;

  const { colorScheme } = useColorScheme();

  return (
    <Card className="mb-4 border-border bg-card">
      <CardContent className="p-5">
        {/* Header Row */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-4">
            <Text className="font-bold text-foreground text-lg mb-1">
              {service.title}
            </Text>
            {service.description && (
              <Text className="text-muted-foreground text-sm mb-2 leading-5">
                {service.description}
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-3">
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
              <Ionicons name="cash-outline" size={16} color={THEME[colorScheme].primary} />
              <Text className="font-semibold text-foreground text-base">
                ${service.base_price}
              </Text>
            </View>
            
            {/* Duration */}
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={16} color={THEME[colorScheme].primary} />
              <Text className="text-muted-foreground text-sm">
                {service.duration_minutes}min
              </Text>
            </View>

            {/* House Call Indicator */}
            {service.house_call_available && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="home-outline" size={16} color={THEME[colorScheme].primary} />
                <Text className="text-muted-foreground text-xs">
                  House Call
                </Text>
              </View>
            )}
          </View>

          {/* Status Badge */}
          <Badge variant={service.is_active ? 'default' : 'secondary'}>
            <Text className="text-xs font-medium">
              {service.is_active ? 'Active' : 'Inactive'}
            </Text>
          </Badge>
        </View>

        {/* Category and Subcategory */}
        {(service.category_name || service.subcategory_name) && (
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="pricetag-outline" size={14} color={THEME[colorScheme].mutedForeground} />
            <Text className="text-muted-foreground text-xs">
              {service.category_name && service.subcategory_name 
                ? `${service.category_name} • ${service.subcategory_name}`
                : service.category_name || service.subcategory_name
              }
            </Text>
          </View>
        )}

        {/* Additional Service Info */}
        {service.deposit_percentage && service.deposit_percentage > 0 && (
          <View className="flex-row items-center gap-1 mb-3">
            <Ionicons name="card-outline" size={14} color={THEME[colorScheme].mutedForeground} />
            <Text className="text-muted-foreground text-xs">
              {service.deposit_percentage}% deposit required
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
            <Ionicons name="pencil" size={16} color={THEME[colorScheme].primary} />
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
                `Are you sure you want to delete "${service.title}"? This action cannot be undone.`,
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
            <Ionicons name="trash" size={16} color={THEME[colorScheme].destructive} />
            <Text className="text-destructive font-medium">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
});

export default function ServicesModalTemp({ visible, onClose }: ServicesModalProps) {
  const { user } = useAuthOptimized();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  // ✅ Zustand store for UI state
  const { 
    isServiceModalVisible,
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
  const { data: services = [], isLoading: servicesLoading, refetch } = useProviderServices(user?.id);
  const { data: categories = [], isLoading: categoriesLoading } = useServiceCategories();
  
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
      houseCallAvailable: false,
    }
  });

  // ✅ Watch form values for dependent fields - NO useEffect
  const watchedCategory = watch('category');

  // ✅ Get subcategories based on selected category - NO useEffect
  const selectedCategoryData = React.useMemo(() => {
    return categories.find(cat => cat.id === watchedCategory);
  }, [categories, watchedCategory]);

  // ✅ Form submission handler - NO useEffect
  const onSubmit = React.useCallback(async (data: ServiceFormData) => {
    if (!user?.id) return;

    try {
      const serviceData = {
        provider_id: user.id,
        title: data.title,
        category_id: data.category,
        subcategory_id: data.subcategory,
        base_price: parseFloat(data.price),
        duration_minutes: parseInt(data.duration),
        price_type: data.priceType,
        description: data.description || '',
        is_active: data.isActive,
        deposit_percentage: parseFloat(data.depositPercentage),
        house_call_available: data.houseCallAvailable,
        requires_deposit: true,
        allows_sos_booking: false,
      };

      if (editingService) {
        await updateServiceMutation.mutateAsync({
          id: editingService.id,
          ...serviceData
        });
      } else {
        await createServiceMutation.mutateAsync(serviceData);
      }

      // Reset form and close
      reset();
      closeServiceModal();
      refetch();
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  }, [user?.id, editingService, updateServiceMutation, createServiceMutation, reset, closeServiceModal, refetch]);

  // ✅ Handle service editing - NO useEffect
  const handleEditService = React.useCallback((service: any) => {
    openServiceModal(service);
    
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
      houseCallAvailable: service.house_call_available ?? false,
    });
  }, [openServiceModal, reset]);

  // ✅ Handle service deletion
  const handleDeleteService = React.useCallback(async (serviceId: string) => {
    if (!user?.id) return;
    try {
      setServiceBeingDeleted(serviceId); // Track which service is being deleted
      await deleteServiceMutation.mutateAsync({
        id: serviceId,
        provider_id: user.id
      });
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
        provider_id: user.id,
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
      <SafeAreaView className="flex-1 bg-background" >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <LinearGradient
            colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">
                {editingService ? 'Edit Service' : 'Manage Services'}
              </Text>
              <Pressable onPress={handleClose}>
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
            {/* Service Form */}
            {(isServiceModalVisible || editingService || services.length === 0) && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <Text className="text-lg font-semibold text-foreground mb-4">
                    {editingService ? 'Edit Service Details' : 'Create New Service'}
                  </Text>

                  <View className="gap-4">
                    {/* Service Name */}
                    <Controller
                      control={control}
                      name="title"
                      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                        <View>
                          <Text className="text-foreground font-medium mb-2">
                            Service Name <Text className="text-red-500">*</Text>
                          </Text>
                          <Input
                            placeholder="e.g., Hair Styling"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            className={error ? "border-red-500" : ""}
                          />
                          {error && (
                            <Text className="text-red-500 text-xs mt-1">{error.message}</Text>
                          )}
                        </View>
                      )}
                    />

                    {/* Category Selection */}
                    {!categoriesLoading && categories.length > 0 && (
                      <Controller
                        control={control}
                        name="category"
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <View>
                            <Text className="text-foreground font-medium mb-2">
                              Category <Text className="text-red-500">*</Text>
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View className="flex-row gap-2">
                                {categories.map((category) => (
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
                              <Text className="text-red-500 text-xs mt-1">{error.message}</Text>
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
                              Subcategory <Text className="text-red-500">*</Text>
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
                              <Text className="text-red-500 text-xs mt-1">{error.message}</Text>
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
                            Price ($) <Text className="text-red-500">*</Text>
                          </Text>
                          <Input
                            placeholder="85"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="numeric"
                            className={error ? "border-red-500" : ""}
                          />
                          {error && (
                            <Text className="text-red-500 text-xs mt-1">{error.message}</Text>
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
                            Duration (minutes) <Text className="text-red-500">*</Text>
                          </Text>
                          <Input
                            placeholder="60"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="numeric"
                            className={error ? "border-red-500" : ""}
                          />
                          {error && (
                            <Text className="text-red-500 text-xs mt-1">{error.message}</Text>
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
                  </View>

                  {/* Form Status */}
                  {hasFormErrors(errors) && (
                    <View className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <Text className="text-red-600 dark:text-red-400 text-sm">
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
            )}

            {/* Services List */}
            {services.length > 0 && (
              <View>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-semibold text-foreground">
                    Your Services ({services.length})
                  </Text>
                  {!isServiceModalVisible && !editingService && (
                    <Button
                      variant="outline"
                      onPress={() => openServiceModal()}
                      className="flex-row items-center gap-2"
                    >
                      <Ionicons name="add" size={16} color={THEME[colorScheme].primary} />
                      <Text className="text-primary font-medium">Add Service</Text>
                    </Button>
                  )}
                </View>

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
                ) : (
                  <View>
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
                )}
              </View>
            )}

            {/* Empty State */}
            {!servicesLoading && services.length === 0 && !isServiceModalVisible && !editingService && (
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
                    onPress={() => openServiceModal()}
                    className="flex-row items-center gap-2"
                  >
                    <Ionicons name="add" size={16} color="white" />
                    <Text className="text-white font-medium">Create Your First Service</Text>
                  </Button>
                </CardContent>
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}