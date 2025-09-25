import React, { useState } from 'react';
import { View, ScrollView, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import {
    useProviderServices,
    useServiceCategories,
    useCreateService,
    useUpdateService,
    useToggleServiceStatus,
    useDeleteService
} from '@/hooks/useProfileData';
import { useColorScheme } from '@/lib/useColorScheme';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useServicesModalStore } from '@/stores/servicesModal';

// Service Card Component
const ServiceCard = ({ service, onEdit, onToggle, onDelete, isDeleting, isToggling }: {
    service: any;
    onEdit: (service: any) => void;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
    isToggling: boolean;
}) => {
   

    console.log('[ServiceCard] Rendering service:', service?.title, service?.is_active);

    if (!service || !service.id) {
        console.warn('[ServiceCard] Invalid service data, not rendering:', service);
        return null; // Don't render invalid services
    }

    return (
        <Card className="mb-4">
            <CardContent className="p-4">
                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                        <Text className="font-bold text-foreground text-lg">{service.title || 'Untitled Service'}</Text>
                        <Text className="text-muted-foreground text-sm">
                            {service.category_name || 'General'} • {service.subcategory_name || 'Service'}
                        </Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-primary font-bold text-xl">${service.base_price || 0}</Text>
                        <Text className="text-muted-foreground text-xs">{service.duration_minutes || 60} min</Text>
                    </View>
                </View>

                <Text className="text-muted-foreground text-sm mb-3 leading-5">
                    {service.description || 'No description provided'}
                </Text>

                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-4">
                        <View className="flex-row items-center gap-1">
                            <Text className="text-muted-foreground text-xs">📅</Text>
                            <Text className="text-muted-foreground text-xs">{service.bookings_count || 0} bookings</Text>
                        </View>
                        <Badge variant={service.is_active ? "default" : "secondary"} className="px-2 py-0.5">
                            <Text className="text-xs font-medium">
                                {service.is_active ? 'Active' : 'Inactive'}
                            </Text>
                        </Badge>
                    </View>
                </View>

                <View className="gap-2">
                    {/* Edit Button - Full Width */}
                    <Button variant="outline" className="w-full" onPress={() => onEdit(service)}>
                        <Text className="text-muted-foreground font-medium text-sm" numberOfLines={1}>Edit</Text>
                    </Button>

                    {/* Deactivate/Activate Button - Full Width */}
                    <Button
                        variant={service.is_active ? "destructive" : "default"}
                        className="w-full"
                        onPress={() => onToggle(service.id)}
                        disabled={isToggling}
                    >
                        {isToggling ? (
                            <View className="flex-row items-center justify-center gap-2">
                                <View className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                <Text className={cn(
                                    'font-medium text-sm',
                                    service.is_active
                                        ? 'text-destructive-foreground'
                                        : 'text-primary-foreground'
                                )}>
                                    {service.is_active ? 'Deactivating...' : 'Activating...'}
                                </Text>
                            </View>
                        ) : (
                            <Text className={cn(
                                'font-medium text-sm',
                                service.is_active
                                    ? 'text-destructive-foreground'
                                    : 'text-primary-foreground'
                            )} numberOfLines={1}>
                                {service.is_active ? 'Deactivate' : 'Activate'}
                            </Text>
                        )}
                    </Button>

                    {/* Delete Button - Full Width with Icon */}
                    <Button
                        variant="destructive"
                        className="w-full"
                        onPress={() => onDelete(service.id)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <View className="flex-row items-center justify-center gap-2">
                                <View className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <Text className="text-destructive-foreground font-medium text-sm">Deleting...</Text>
                            </View>
                        ) : (
                            <View className="flex-row items-center justify-center gap-2">
                                <Ionicons name="trash" size={16} color="white" />
                                <Text className="text-destructive-foreground font-medium text-sm">Delete</Text>
                            </View>
                        )}
                    </Button>
                </View>
            </CardContent>
        </Card>
    );
};

// Add/Edit Service Modal
const ServiceModal = ({
    visible,
    service,
    categories,
    onClose,
    onSave
}: {
    visible: boolean;
    service?: any;
    categories: any[];
    onClose: () => void;
    onSave: (service: any) => void;
}) => {
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();
    const [formData, setFormData] = useState({
        title: service?.title || '',
        category: service?.category_id || (categories[0]?.id || ''),
        subcategory: service?.subcategory_id || (categories[0]?.service_subcategories?.[0]?.id || ''),
        price: service?.base_price?.toString() || '',
        duration: service?.duration_minutes?.toString() || '',
        priceType: service?.price_type || 'fixed',
        description: service?.description || '',
        isActive: service?.is_active ?? true,
        // Business terms
        depositPercentage: service?.custom_deposit_percentage?.toString() || service?.deposit_percentage?.toString() || '20',
        cancellationPolicy: service?.custom_cancellation_policy || service?.cancellation_policy || '',
        houseCallAvailable: service?.house_call_available ?? false,
        houseCallExtraFee: service?.house_call_extra_fee?.toString() || '0',
        allowsSosBooking: service?.allows_sos_booking ?? false,
    });

    // Update form data when service changes
    React.useEffect(() => {
        if (service) {
            setFormData({
                title: service.title || '',
                category: service.category_id || (categories[0]?.id || ''),
                subcategory: service.subcategory_id || (categories[0]?.service_subcategories?.[0]?.id || ''),
                price: service.base_price?.toString() || '',
                duration: service.duration_minutes?.toString() || '',
                priceType: service.price_type || 'fixed',
                description: service.description || '',
                isActive: service.is_active ?? true,
                // Business terms
                depositPercentage: service.custom_deposit_percentage?.toString() || service.deposit_percentage?.toString() || '20',
                cancellationPolicy: service.custom_cancellation_policy || service.cancellation_policy || '',
                houseCallAvailable: service.house_call_available ?? false,
                houseCallExtraFee: service.house_call_extra_fee?.toString() || '0',
                allowsSosBooking: service.allows_sos_booking ?? false,
            });
        } else {
            setFormData({
                title: '',
                category: categories[0]?.id || '',
                subcategory: categories[0]?.service_subcategories?.[0]?.id || '',
                price: '',
                duration: '',
                priceType: 'fixed',
                description: '',
                isActive: true,
                // Business terms defaults
                depositPercentage: '20',
                cancellationPolicy: '',
                houseCallAvailable: false,
                houseCallExtraFee: '0',
                allowsSosBooking: false,
            });
        }
    }, [service, categories]);

    const handleSave = () => {
        const serviceData = {
            ...service,
            ...formData,
            price: parseFloat(formData.price),
            duration: parseInt(formData.duration),
            priceType: formData.priceType,
            category_id: formData.category,
            subcategory_id: formData.subcategory,
            // Business terms
            custom_deposit_percentage: parseFloat(formData.depositPercentage),
            custom_cancellation_policy: formData.cancellationPolicy,
            house_call_available: formData.houseCallAvailable,
            house_call_extra_fee: parseFloat(formData.houseCallExtraFee),
            allows_sos_booking: formData.allowsSosBooking,
        };
        onSave(serviceData);
        onClose();
    };

    const selectedCategory = categories.find(cat => cat.id === formData.category);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-background">
                <LinearGradient
                    colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-white text-xl font-bold">
                                {service ? 'Edit Service' : 'Add New Service'}
                            </Text>
                            <Text className="text-white/70 text-sm mt-1">
                                {service ? 'Update your service details' : 'Create a new service offering'}
                            </Text>
                        </View>
                        <Button variant="ghost" onPress={onClose} className="w-auto p-2">
                            <Ionicons name="close" size={20} color="white" />
                        </Button>
                    </View>
                </LinearGradient>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                >
                    <ScrollView
                        className="flex-1 px-4 py-6"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                    >
                    <View className="gap-6">
                        {/* Service Name */}
                        <View>
                            <Text className="text-foreground font-medium mb-2">Service Name</Text>
                            <Input
                                placeholder="e.g., Haircut & Styling"
                                value={formData.title}
                                onChangeText={(text) => setFormData({ ...formData, title: text })}
                                className="bg-card"
                            />
                        </View>

                        {/* Category Selection */}
                        <View>
                            <Text className="text-foreground font-medium mb-2">Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row gap-2">
                                    {categories.map((category) => (
                                        <Pressable
                                            key={category.id}
                                            className={cn(
                                                'px-3 py-2 rounded-full transition-all duration-200 min-h-[36px] min-w-[36px] items-center justify-center',
                                                formData.category === category.id
                                                    ? 'bg-primary shadow-lg shadow-primary/25'
                                                    : 'bg-card/60 active:bg-card/80 dark:bg-card/30 dark:active:bg-card/60 shadow-sm shadow-black/5'
                                            )}
                                            onPress={() => {
                                                setFormData({
                                                    ...formData,
                                                    category: category.id,
                                                    subcategory: category.service_subcategories?.[0]?.id || ''
                                                });
                                            }}
                                            style={({ pressed }) => ({
                                                opacity: pressed ? 0.7 : 1,
                                            })}
                                        >
                                            <Text className={cn(
                                                'text-sm font-medium',
                                                formData.category === category.id
                                                    ? 'text-primary-foreground'
                                                    : 'text-muted-foreground'
                                            )}>
                                                {category.icon || '⚙️'} {category.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Subcategory Selection */}
                        {selectedCategory?.service_subcategories && (
                            <View>
                                <Text className="text-foreground font-medium mb-2">Service Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                        {selectedCategory.service_subcategories.map((subcategory: any) => (
                                            <Pressable
                                                key={subcategory.id}
                                                className={cn(
                                                    'px-3 py-2 rounded-full transition-all duration-200 min-h-[36px] min-w-[36px] items-center justify-center',
                                                    formData.subcategory === subcategory.id
                                                        ? 'bg-primary shadow-lg shadow-primary/25'
                                                        : 'bg-card/60 active:bg-card/80 dark:bg-card/30 dark:active:bg-card/60 shadow-sm shadow-black/5'
                                                )}
                                                onPress={() => setFormData({ ...formData, subcategory: subcategory.id })}
                                                style={({ pressed }) => ({
                                                    opacity: pressed ? 0.7 : 1,
                                                })}
                                            >
                                                <Text className={cn(
                                                    'text-sm font-medium',
                                                    formData.subcategory === subcategory.id
                                                        ? 'text-primary-foreground'
                                                        : 'text-muted-foreground'
                                                )}>
                                                    {subcategory.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        {/* Price and Duration */}
                        <View className="flex-row gap-4">
                            <View className="flex-1">
                                <Text className="text-foreground font-medium mb-2">Price ($)</Text>
                                <Input
                                    placeholder="85"
                                    value={formData.price}
                                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                                    keyboardType="numeric"
                                    className="bg-card"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-foreground font-medium mb-2">Duration (min)</Text>
                                <Input
                                    placeholder="90"
                                    value={formData.duration}
                                    onChangeText={(text) => setFormData({ ...formData, duration: text })}
                                    keyboardType="numeric"
                                    className="bg-card"
                                />
                            </View>
                        </View>

                        {/* Price Type */}
                        <View>
                            <Text className="text-foreground font-medium mb-2">Price Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row gap-2">
                                    {[
                                        { value: 'fixed', label: 'Fixed Price', icon: '💰' },
                                        { value: 'hourly', label: 'Hourly Rate', icon: '⏰' },
                                    ].map((type) => (
                                        <Pressable
                                            key={type.value}
                                            className={cn(
                                                'px-3 py-2 rounded-full transition-all duration-200 min-h-[36px] min-w-[36px] items-center justify-center',
                                                formData.priceType === type.value
                                                    ? 'bg-primary shadow-lg shadow-primary/25'
                                                    : 'bg-card/60 active:bg-card/80 dark:bg-card/30 dark:active:bg-card/60 shadow-sm shadow-black/5'
                                            )}
                                            onPress={() => setFormData({ ...formData, priceType: type.value })}
                                            style={({ pressed }) => ({
                                                opacity: pressed ? 0.7 : 1,
                                            })}
                                        >
                                            <Text className={cn(
                                                'text-sm font-medium',
                                                formData.priceType === type.value
                                                    ? 'text-primary-foreground'
                                                    : 'text-muted-foreground'
                                            )}>
                                                {type.icon} {type.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Description */}
                        <View>
                            <Text className="text-foreground font-medium mb-2">Description</Text>
                            <Textarea
                                placeholder="Describe your service in detail..."
                                value={formData.description}
                                onChangeText={(text) => setFormData({ ...formData, description: text })}
                                className="bg-card min-h-[100px]"
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        {/* Business Terms Section */}
                        <View className="pt-4 border-t border-border">
                            <Text className="text-foreground font-semibold mb-4 text-lg">Business Terms</Text>

                            {/* Deposit Settings */}
                            <View className="mb-6">
                                <Text className="text-foreground font-medium mb-3">Deposit & Payment</Text>
                                <View className="gap-4">
                                    <View>
                                        <Text className="text-muted-foreground text-sm mb-2">Deposit Percentage (%)</Text>
                                        <Input
                                            placeholder="20"
                                            value={formData.depositPercentage}
                                            onChangeText={(text) => setFormData({ ...formData, depositPercentage: text })}
                                            keyboardType="numeric"
                                            className="bg-card"
                                        />
                                        <Text className="text-muted-foreground text-xs mt-1">
                                            Percentage of service price required as deposit
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Cancellation Policy */}
                            <View className="mb-6">
                                <Text className="text-foreground font-medium mb-3">Cancellation Policy</Text>
                                <View className="gap-4">
                                    <View>
                                        <Text className="text-muted-foreground text-sm mb-2">Cancellation Policy</Text>
                                        <Textarea
                                            placeholder="Describe your cancellation policy..."
                                            value={formData.cancellationPolicy}
                                            onChangeText={(text) => setFormData({ ...formData, cancellationPolicy: text })}
                                            className="bg-card min-h-[80px]"
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Service Options */}
                            <View className="mb-6">
                                <Text className="text-foreground font-medium mb-3">Service Options</Text>
                                <View className="gap-4">
                                    {/* House Call Option */}
                                    <View className="flex-row items-center justify-between py-3">
                                        <View className="flex-1">
                                            <Text className="text-foreground font-medium">House Calls Available</Text>
                                            <Text className="text-muted-foreground text-sm">
                                                Offer this service at customer's location
                                            </Text>
                                        </View>
                                        <Switch
                                            checked={formData.houseCallAvailable}
                                            onCheckedChange={(checked) => setFormData({ ...formData, houseCallAvailable: checked })}
                                        />
                                    </View>

                                    {/* House Call Extra Fee */}
                                    {formData.houseCallAvailable && (
                                        <View>
                                            <Text className="text-muted-foreground text-sm mb-2">House Call Extra Fee ($)</Text>
                                            <Input
                                                placeholder="0"
                                                value={formData.houseCallExtraFee}
                                                onChangeText={(text) => setFormData({ ...formData, houseCallExtraFee: text })}
                                                keyboardType="numeric"
                                                className="bg-card"
                                            />
                                            <Text className="text-muted-foreground text-xs mt-1">
                                                Additional fee for house call services
                                            </Text>
                                        </View>
                                    )}

                                    {/* SOS Booking Option */}
                                    <View className="flex-row items-center justify-between py-3">
                                        <View className="flex-1">
                                            <Text className="text-foreground font-medium">SOS Emergency Booking</Text>
                                            <Text className="text-muted-foreground text-sm">
                                                Allow instant emergency bookings for this service
                                            </Text>
                                        </View>
                                        <Switch
                                            checked={formData.allowsSosBooking}
                                            onCheckedChange={(checked) => setFormData({ ...formData, allowsSosBooking: checked })}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer Actions */}
                <View className="px-4 mt-4" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                    <View className="flex-row gap-3">
                        <Button variant="outline" className="flex-1" onPress={onClose}>
                            <Text className="text-muted-foreground font-medium text-sm">Cancel</Text>
                        </Button>
                        <Button variant="default" className="flex-1" onPress={handleSave}>
                            <Text className="text-primary-foreground font-bold text-sm">
                                {service ? 'Update Service' : 'Add Service'}
                            </Text>
                        </Button>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

interface ServicesModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ServicesModal({ visible, onClose }: ServicesModalProps) {
    const { user } = useAuth();
    const { colorScheme } = useColorScheme();
    const { data: servicesData, isLoading, error, refetch } = useProviderServices(user?.id);
    const { data: categoriesData, isLoading: categoriesLoading } = useServiceCategories();
    const createServiceMutation = useCreateService();
    const updateServiceMutation = useUpdateService();
    const toggleServiceMutation = useToggleServiceStatus();
    const deleteServiceMutation = useDeleteService();

    // Use Zustand store for modal state
    const {
        isServiceModalVisible,
        editingService,
        selectedCategory,
        showActiveOnly,
        openServiceModal,
        closeServiceModal,
        setSelectedCategory,
        setShowActiveOnly,
        deleteDialogOpen,
        serviceToDelete,
        openDeleteDialog,
        closeDeleteDialog,
        serviceBeingToggled,
        setServiceBeingToggled,
        _hasHydrated
    } = useServicesModalStore();

    // Wait for hydration before rendering
    if (!_hasHydrated) {
        console.log('[ServicesModal] Waiting for store hydration...');
        return null;
    }

    console.log('[ServicesModal] Render - Provider ID:', user?.id, 'Services:', servicesData?.length || 0, 'Selected category:', selectedCategory);

    const handleAddService = () => {
        console.log('[ServicesModal] Adding new service');
        setSelectedCategory('All'); // Reset to 'All' when opening modal
        openServiceModal();
    };

    const handleEditService = (service: any) => {
        console.log('[ServicesModal] Editing service:', service.id);
        openServiceModal(service);
    };

    const handleSaveService = async (serviceData: any) => {
        try {
            console.log('[ServicesModal] Saving service:', serviceData.title);
            if (editingService) {
                // Update existing service
                await updateServiceMutation.mutateAsync({
                    id: editingService.id,
                    provider_id: user?.id || '',
                    subcategory_id: serviceData.subcategory_id,
                    title: serviceData.title,
                    description: serviceData.description,
                    base_price: serviceData.price,
                    duration_minutes: serviceData.duration,
                    price_type: serviceData.priceType,
                    // Business terms
                    deposit_percentage: serviceData.custom_deposit_percentage,
                    cancellation_policy: serviceData.custom_cancellation_policy,
                    house_call_available: serviceData.house_call_available,
                    house_call_extra_fee: serviceData.house_call_extra_fee,
                    allows_sos_booking: serviceData.allows_sos_booking,
                });
                console.log('[ServicesModal] Service updated successfully');
            } else {
                // Create new service
                await createServiceMutation.mutateAsync({
                    provider_id: user?.id || '',
                    subcategory_id: serviceData.subcategory_id,
                    title: serviceData.title,
                    description: serviceData.description,
                    base_price: serviceData.price,
                    duration_minutes: serviceData.duration,
                    price_type: serviceData.priceType,
                    is_active: true,
                    // Business terms
                    deposit_percentage: serviceData.custom_deposit_percentage,
                    cancellation_policy: serviceData.custom_cancellation_policy,
                    house_call_available: serviceData.house_call_available,
                    house_call_extra_fee: serviceData.house_call_extra_fee,
                    allows_sos_booking: serviceData.allows_sos_booking,
                });
                console.log('[ServicesModal] Service created successfully');
            }
            closeServiceModal();
        } catch (error) {
            console.error('[ServicesModal] Error saving service:', error);
            alert('Failed to save service. Please try again.');
        }
    };

    const handleToggleService = async (id: string) => {
        const service = servicesData?.find(s => s.id === id);

        console.log('[ServicesModal] Toggling service:', {
            serviceId: id,
            serviceFound: !!service,
            currentStatus: service?.is_active,
            newStatus: !service?.is_active
        });

        // Set the service being toggled
        setServiceBeingToggled(id);

        try {
            if (!service) {
                console.error('[ServicesModal] Service not found for toggle:', id);
                alert('Service not found.');
                return;
            }

            await toggleServiceMutation.mutateAsync({
                id,
                provider_id: user?.id || '',
                is_active: !service.is_active,
            });

            console.log('[ServicesModal] Service toggle completed successfully');

            // Cache invalidation is handled automatically by the mutation's onSuccess callback
            // No manual refetch needed
        } catch (error) {
            console.error('[ServicesModal] Error toggling service:', error);
            alert(`Failed to ${service?.is_active ? 'deactivate' : 'activate'} service. Please try again.`);
        } finally {
            // Clear the service being toggled
            setServiceBeingToggled(null);
        }
    };

    const handleDeleteService = (id: string) => {
        console.log('[ServicesModal] handleDeleteService called with id:', id);
        openDeleteDialog(id);
    };

    const confirmDeleteService = async () => {
        console.log('[ServicesModal] Confirming delete for service:', serviceToDelete);
        if (!serviceToDelete) return;

        try {
            await deleteServiceMutation.mutateAsync({
                id: serviceToDelete,
                provider_id: user?.id || '',
            });

            console.log('[ServicesModal] Service deleted successfully');
            closeDeleteDialog();
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Failed to delete service. Please try again.');
        }
    };

    const cancelDeleteService = () => {
        console.log('[ServicesModal] Cancelling delete');
        closeDeleteDialog();
    };

    const filteredServices = servicesData
        ? (() => {
            let filtered = servicesData;

            // Filter by category first
            if (selectedCategory !== 'All') {
                filtered = filtered.filter(s => s.category_id && s.category_id === selectedCategory);
            }

            // Then filter by active status if needed
            if (showActiveOnly) {
                filtered = filtered.filter(s => s.is_active);
            }

            return filtered;
        })()
        : [];

    console.log('[ServicesModal] Filtered services:', {
        totalServices: servicesData?.length || 0,
        filteredCount: filteredServices.length,
        showActiveOnly
    });

    // Create categories array with proper structure for filtering
    const categories = categoriesData ? [
        { id: 'All', name: 'All', icon: '📋' },
        ...categoriesData.map(cat => ({ id: cat.id, name: cat.name, icon: cat.icon_url || '⚙️' }))
    ] : [{ id: 'All', name: 'All', icon: '📋' }];

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-background">
                {/* Header with Gradient */}
                <LinearGradient
                    colors={[THEME[colorScheme].gradientStart, THEME[colorScheme].gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 }}
                >
                    {/* Top Row - Back Button and Add Service Button */}
                    <View className="flex-row items-center justify-between mb-6">
                        <Button variant="ghost" onPress={onClose} className="w-auto p-2">
                            <Ionicons name="chevron-back" size={20} color="white" />
                        </Button>

                        <Button variant="ghost" onPress={handleAddService} className="border border-white">
                            <Text className="text-white font-medium text-sm">+ Add Service</Text>
                        </Button>
                    </View>

                    {/* Title Section */}
                    <View className="mb-6">
                        <Text className="text-white text-xl font-bold">
                            Service Management
                        </Text>
                        <Text className="text-white/70 text-sm mt-1">
                            Manage your offerings and pricing
                        </Text>
                    </View>

                    {/* Category Filter */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 16 }}
                    >
                        <View className="flex-row gap-2 pr-4">
                            {categories.map((category) => {
                                return (
                                    <View key={category.id} className="items-center justify-center">
                                        <Pressable
                                            className={cn(
                                                'px-3 py-2 rounded-full transition-all duration-200 min-h-[36px] min-w-[36px] items-center justify-center',
                                                selectedCategory === category.id
                                                    ? 'bg-primary shadow-lg shadow-primary/25'
                                                    : 'bg-card/60 active:bg-card/80 dark:bg-card/30 dark:active:bg-card/60 shadow-sm shadow-black/5'
                                            )}
                                            onPress={() => {
                                                setSelectedCategory(category.id);
                                            }}
                                            style={({ pressed }) => ({
                                                opacity: pressed ? 0.7 : 1,
                                            })}
                                        >
                                            <Text className={cn(
                                                'text-sm font-medium',
                                                selectedCategory === category.id
                                                    ? 'text-primary-foreground'
                                                    : 'text-muted-foreground'
                                            )}>
                                                {category.icon || '⚙️'} {category.name}
                                            </Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Status Filter */}
                    <View className="flex-row gap-2 mt-2">
                        <Pressable
                            className={cn(
                                'px-3 py-2 rounded-full transition-all duration-200 min-h-[36px] min-w-[36px] items-center justify-center',
                                !showActiveOnly
                                    ? 'bg-primary shadow-lg shadow-primary/25'
                                    : 'bg-card/60 active:bg-card/80 dark:bg-card/30 dark:active:bg-card/60 shadow-sm shadow-black/5'
                            )}
                            onPress={() => {
                                setShowActiveOnly(false);
                            }}
                            style={({ pressed }) => ({
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <Text className={cn(
                                'text-sm font-medium',
                                !showActiveOnly
                                    ? 'text-primary-foreground'
                                    : 'text-muted-foreground'
                            )}>
                                All Services
                            </Text>
                        </Pressable>
                        <Pressable
                            className={cn(
                                'px-3 py-2 rounded-full transition-all duration-200 min-h-[36px] min-w-[36px] items-center justify-center',
                                showActiveOnly
                                    ? 'bg-primary shadow-lg shadow-primary/25'
                                    : 'bg-card/60 active:bg-card/80 dark:bg-card/30 dark:active:bg-card/60 shadow-sm shadow-black/5'
                            )}
                            onPress={() => {
                                setShowActiveOnly(true);
                            }}
                            style={({ pressed }) => ({
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <Text className={cn(
                                'text-sm font-medium',
                                showActiveOnly
                                    ? 'text-primary-foreground'
                                    : 'text-muted-foreground'
                            )}>
                                Active Only
                            </Text>
                        </Pressable>
                    </View>
                </LinearGradient>

                {/* Stats Overview */}
                <View className="px-4 -mt-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            <View className="flex-row justify-between items-center">
                                <View className="items-center">
                                    <Text className="text-2xl font-bold text-foreground">{servicesData?.length || 0}</Text>
                                    <Text className="text-muted-foreground text-xs">Total Services</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-2xl font-bold text-foreground">
                                        {servicesData?.filter(s => s.is_active).length || 0}
                                    </Text>
                                    <Text className="text-muted-foreground text-xs">Active</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-2xl font-bold text-foreground">
                                        ${servicesData && servicesData.length > 0 ? Math.round(servicesData.reduce((sum, s) => sum + s.base_price, 0) / servicesData.length) : 0}
                                    </Text>
                                    <Text className="text-muted-foreground text-xs">Avg Price</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-2xl font-bold text-foreground">
                                        {servicesData?.reduce((sum, s) => sum + (s.bookings_count || 0), 0) || 0}
                                    </Text>
                                    <Text className="text-muted-foreground text-xs">Total Bookings</Text>
                                </View>
                            </View>
                        </CardContent>
                    </Card>
                </View>

                {/* Services List */}
                <ScrollView className="flex-1 px-4">
                    {isLoading ? (
                        <View className="gap-4">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="mb-4">
                                    <CardContent className="p-4">
                                        <View className="flex-row items-start justify-between mb-3">
                                            <View className="flex-1">
                                                <Skeleton className="w-32 h-6 mb-2" />
                                                <Skeleton className="w-24 h-4" />
                                            </View>
                                            <View className="items-end">
                                                <Skeleton className="w-16 h-6 mb-1" />
                                                <Skeleton className="w-12 h-4" />
                                            </View>
                                        </View>
                                        <Skeleton className="w-full h-4 mb-3" />
                                        <View className="flex-row items-center justify-between">
                                            <Skeleton className="w-16 h-4" />
                                            <Skeleton className="w-12 h-6 rounded-full" />
                                        </View>
                                    </CardContent>
                                </Card>
                            ))}
                        </View>
                    ) : error ? (
                        <View className="items-center py-8">
                            <Text className="text-destructive mb-2">Error loading services</Text>
                            <Button onPress={() => refetch()}>
                                <Text>Retry</Text>
                            </Button>
                        </View>
                    ) : filteredServices.length > 0 ? (
                        filteredServices.map((service) => (
                            <ServiceCard
                                key={service.id}
                                service={service}
                                onEdit={handleEditService}
                                onToggle={handleToggleService}
                                onDelete={handleDeleteService}
                                isDeleting={deleteServiceMutation.isPending && serviceToDelete === service.id}
                                isToggling={toggleServiceMutation.isPending && serviceBeingToggled === service.id}
                            />
                        ))
                    ) : (
                        <Card>
                            <CardContent className="p-8 items-center">
                                <View className="w-16 h-16 bg-muted rounded-full items-center justify-center mb-4">
                                    <Text className="text-2xl">⚙️</Text>
                                </View>
                                <Text className="text-foreground font-semibold text-lg mb-2">
                                    No services in this category
                                </Text>
                                <Text className="text-muted-foreground text-center text-sm mb-4">
                                    {selectedCategory === 'All'
                                        ? showActiveOnly
                                            ? 'No active services found'
                                            : 'Start by adding your first service'
                                        : showActiveOnly
                                            ? `No active services found in ${selectedCategory}`
                                            : `No services found in ${selectedCategory}`
                                    }
                                </Text>
                                <Button onPress={handleAddService} className="px-6">
                                    <Text className="font-medium">Add Service</Text>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </ScrollView>

                {/* Service Modal */}
                <ServiceModal
                    visible={isServiceModalVisible}
                    service={editingService}
                    categories={categoriesData || []}
                    onClose={closeServiceModal}
                    onSave={handleSaveService}
                />

                {/* Delete Confirmation Dialog */}
                <Modal visible={deleteDialogOpen} transparent animationType="fade">
                    <View className="flex-1 bg-black/50 items-center justify-center p-4">
                        <View className="bg-background rounded-lg p-6 w-full max-w-sm">
                            <Text className="text-foreground font-semibold text-lg mb-2">Delete Service</Text>
                            <Text className="text-muted-foreground text-sm mb-6">
                                Are you sure you want to delete this service? This action cannot be undone.
                            </Text>
                            <View className="flex-row gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onPress={cancelDeleteService}
                                    disabled={deleteServiceMutation.isPending}
                                >
                                    <Text className="text-muted-foreground font-medium">Cancel</Text>
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onPress={confirmDeleteService}
                                    disabled={deleteServiceMutation.isPending}
                                >
                                    {deleteServiceMutation.isPending ? (
                                        <View className="flex-row items-center gap-2">
                                            <View className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <Text className="text-destructive-foreground font-medium">Deleting...</Text>
                                        </View>
                                    ) : (
                                        <Text className="text-destructive-foreground font-medium">Delete</Text>
                                    )}
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
}