import React, { useState } from 'react';
import { View, ScrollView, Platform, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Service categories
const serviceCategories = [
  'Hair Styling', 'Makeup', 'Nails', 'Skincare', 'Massage', 'Fitness', 'Beauty', 'Wellness'
];

// Mock services data
const mockServices = [
  {
    id: '1',
    name: 'Haircut & Styling',
    category: 'Hair Styling',
    price: 85,
    duration: 90,
    description: 'Professional haircut with styling and consultation',
    isActive: true,
    bookings: 24
  },
  {
    id: '2',
    name: 'Makeup Session',
    category: 'Makeup',
    price: 120,
    duration: 120,
    description: 'Full makeup application for special events',
    isActive: true,
    bookings: 18
  },
  {
    id: '3',
    name: 'Hair Color Treatment',
    category: 'Hair Styling',
    price: 180,
    duration: 180,
    description: 'Complete hair coloring with premium products',
    isActive: true,
    bookings: 12
  },
  {
    id: '4',
    name: 'Basic Facial',
    category: 'Skincare',
    price: 75,
    duration: 60,
    description: 'Cleansing and hydrating facial treatment',
    isActive: false,
    bookings: 6
  }
];

// Service Card Component
const ServiceCard = ({ service, onEdit, onToggle }: { 
  service: typeof mockServices[0]; 
  onEdit: (service: typeof mockServices[0]) => void;
  onToggle: (id: string) => void;
}) => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="font-bold text-foreground text-lg">{service.name}</Text>
          <Text className="text-muted-foreground text-sm">{service.category}</Text>
        </View>
        <View className="items-end">
          <Text className="text-primary font-bold text-xl">${service.price}</Text>
          <Text className="text-muted-foreground text-xs">{service.duration} min</Text>
        </View>
      </View>

      <Text className="text-muted-foreground text-sm mb-3 leading-5">
        {service.description}
      </Text>

      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-1">
            <Text className="text-xs">📅</Text>
            <Text className="text-muted-foreground text-xs">{service.bookings} bookings</Text>
          </View>
          <View className={cn(
            'px-2 py-1 rounded-full',
            service.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-900/30'
          )}>
            <Text className={cn(
              'text-xs font-medium',
              service.isActive ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'
            )}>
              {service.isActive ? '✓ Active' : '⏸ Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity className="flex-1" onPress={() => onEdit(service)}>
          <View className="bg-secondary/10 border border-secondary/20 rounded-lg py-3 items-center">
            <Text className="text-muted-foreground font-medium text-sm">Edit Service</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1" onPress={() => onToggle(service.id)}>
          <View className={cn(
            'rounded-lg py-3 items-center',
            service.isActive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/10'
          )}>
            <Text className={cn(
              'font-medium text-sm',
              service.isActive ? 'text-red-700 dark:text-red-300' : 'text-primary'
            )}>
              {service.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </CardContent>
  </Card>
);

// Add/Edit Service Modal
const ServiceModal = ({ 
  visible, 
  service, 
  onClose, 
  onSave 
}: { 
  visible: boolean; 
  service?: typeof mockServices[0]; 
  onClose: () => void;
  onSave: (service: any) => void;
}) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    category: service?.category || serviceCategories[0],
    price: service?.price?.toString() || '',
    duration: service?.duration?.toString() || '',
    description: service?.description || ''
  });

  const handleSave = () => {
    onSave({
      ...service,
      ...formData,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration)
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-background">
        <LinearGradient
          colors={['#EC6751', '#F4A261']}
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
            <TouchableOpacity onPress={onClose}>
              <Text className="text-white/80 text-sm">✕ Close</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView className="flex-1 px-4 py-6">
          <View className="gap-6">
            {/* Service Name */}
            <View>
              <Text className="text-foreground font-medium mb-2">Service Name</Text>
              <Input
                placeholder="e.g., Haircut & Styling"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                className="bg-card"
              />
            </View>

            {/* Category Selection */}
            <View>
              <Text className="text-foreground font-medium mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {serviceCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setFormData({ ...formData, category })}
                    >
                      <View className={cn(
                        'px-4 py-2 rounded-full border',
                        formData.category === category 
                          ? 'bg-primary border-primary' 
                          : 'bg-card border-border'
                      )}>
                        <Text className={cn(
                          'text-sm font-medium',
                          formData.category === category 
                            ? 'text-primary-foreground' 
                            : 'text-muted-foreground'
                        )}>
                          {category}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

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
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View className="px-4 pb-4">
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1" onPress={onClose}>
              <View className="bg-secondary/10 border border-secondary/20 rounded-lg py-4 items-center">
                <Text className="text-muted-foreground font-medium text-sm">Cancel</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1" onPress={handleSave}>
              <View className="bg-primary rounded-lg py-4 items-center">
                <Text className="text-primary-foreground font-bold text-sm">
                  {service ? 'Update Service' : 'Add Service'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default function ProviderServices() {
  const [services, setServices] = useState(mockServices);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<typeof mockServices[0] | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const handleAddService = () => {
    setEditingService(undefined);
    setModalVisible(true);
  };

  const handleEditService = (service: typeof mockServices[0]) => {
    setEditingService(service);
    setModalVisible(true);
  };

  const handleSaveService = (serviceData: any) => {
    if (editingService) {
      // Update existing service
      setServices(services.map(s => s.id === editingService.id ? { ...s, ...serviceData } : s));
    } else {
      // Add new service
      const newService = {
        ...serviceData,
        id: Date.now().toString(),
        isActive: true,
        bookings: 0
      };
      setServices([...services, newService]);
    }
  };

  const handleToggleService = (id: string) => {
    setServices(services.map(s => 
      s.id === id ? { ...s, isActive: !s.isActive } : s
    ));
  };

  const filteredServices = selectedCategory === 'All' 
    ? services 
    : services.filter(s => s.category === selectedCategory);

  const categories = ['All', ...serviceCategories];

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#EC6751', '#F4A261']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white/80 text-sm mb-2">← Back</Text>
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">
              Service Management
            </Text>
            <Text className="text-white/70 text-sm mt-1">
              Manage your offerings and pricing
            </Text>
          </View>

          <TouchableOpacity onPress={handleAddService}>
            <View className="bg-muted/30 px-4 py-2 rounded-full">
              <Text className="text-foreground font-medium text-sm">+ Add Service</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
              >
                <View className={cn(
                  'px-4 py-2 rounded-full',
                  selectedCategory === category 
                    ? 'bg-card' 
                    : 'bg-muted/30'
                )}>
                  <Text className={cn(
                    'text-sm font-medium',
                    selectedCategory === category 
                      ? 'text-foreground' 
                      : 'text-white/80'
                  )}>
                    {category}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Stats Overview */}
      <View className="px-4 -mt-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <View className="flex-row justify-between items-center">
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">{services.length}</Text>
                <Text className="text-muted-foreground text-xs">Total Services</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">
                  {services.filter(s => s.isActive).length}
                </Text>
                <Text className="text-muted-foreground text-xs">Active</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">
                  ${Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length)}
                </Text>
                <Text className="text-muted-foreground text-xs">Avg Price</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-foreground">
                  {services.reduce((sum, s) => sum + s.bookings, 0)}
                </Text>
                <Text className="text-muted-foreground text-xs">Total Bookings</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Services List */}
      <ScrollView className="flex-1 px-4">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEditService}
              onToggle={handleToggleService}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 items-center">
              <Text className="text-6xl mb-4">🔧</Text>
              <Text className="text-foreground font-semibold text-lg mb-2">
                No services in this category
              </Text>
              <Text className="text-muted-foreground text-center text-sm mb-4">
                {selectedCategory === 'All' 
                  ? 'Start by adding your first service'
                  : `No services found in ${selectedCategory}`
                }
              </Text>
              <TouchableOpacity onPress={handleAddService}>
                <View className="bg-primary rounded-lg px-6 py-3">
                  <Text className="text-primary-foreground font-medium">Add Service</Text>
                </View>
              </TouchableOpacity>
            </CardContent>
          </Card>
        )}
      </ScrollView>

      {/* Service Modal */}
      <ServiceModal
        visible={modalVisible}
        service={editingService}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveService}
      />

      {/* Bottom spacing for tab bar */}
      <View className={cn("h-6", Platform.OS === 'ios' && "h-24")} />
    </SafeAreaView>
  );
}