import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Controller } from 'react-hook-form';
import { Control, FieldErrors } from 'react-hook-form';

import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';
import type { ServiceFormData } from '@/lib/validation';

interface FormSectionProps {
  control: Control<ServiceFormData>;
  errors: FieldErrors<ServiceFormData>;
}

interface ServiceDetailsProps extends FormSectionProps {
  categories?: Array<{ id: string; name: string }>;
  categoriesLoading?: boolean;
  subcategories?: Array<{ id: string; name: string }>;
  subcategoriesLoading?: boolean;
}

export const ServiceDetailsSection = React.memo(({
  control,
  errors,
  categories,
  categoriesLoading = false,
  subcategories,
  subcategoriesLoading = false
}: ServiceDetailsProps) => {
  return (
    <Card className="mx-1">
      <CardHeader className="pb-2">
        <View className="flex-row items-center gap-3">
          <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
            <Text className="text-sm font-bold text-primary-foreground">1</Text>
          </View>
          <CardTitle>Service Details</CardTitle>
        </View>
      </CardHeader>
      <CardContent className="gap-4 pt-0 px-3 pb-3">
        {/* Service Title */}
        <View>
          <View className="flex-row items-center justify-between gap-2 mb-3">
            <Text className="text-sm font-semibold text-foreground flex-1">Service Title</Text>
            <Badge variant="secondary" className="shrink-0">
              <Text className="text-xs font-medium">Required</Text>
            </Badge>
          </View>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <>
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g., House Cleaning, Plumbing"
                  className={cn('mb-1.5', errors.title && 'border-destructive')}
                />
                {!errors.title && (
                  <Text className="text-xs text-muted-foreground mt-1.5">
                    Give your service a clear, descriptive name
                  </Text>
                )}
              </>
            )}
          />
          {errors.title && (
            <Text className="text-destructive text-xs mt-1.5 font-medium">
              ✕ {errors.title.message}
            </Text>
          )}
        </View>

        {/* Description */}
        <View>
          <View className="flex-row items-center justify-between gap-2 mb-3">
            <Text className="text-sm font-semibold text-foreground flex-1">Description</Text>
            <Badge variant="secondary" className="shrink-0">
              <Text className="text-xs font-medium">Required</Text>
            </Badge>
          </View>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <>
                <Textarea
                  value={value}
                  onChangeText={onChange}
                  placeholder="Detail what's included in this service..."
                  className={cn('min-h-[100px] mb-1.5', errors.description && 'border-destructive')}
                />
                {!errors.description && (
                  <Text className="text-xs text-muted-foreground mt-1.5">
                    Include what's covered, any preparations needed, etc.
                  </Text>
                )}
              </>
            )}
          />
          {errors.description && (
            <Text className="text-destructive text-xs mt-1.5 font-medium">
              ✕ {errors.description.message}
            </Text>
          )}
        </View>

        {/* Category Selection */}
        <View>
          <View className="flex-row items-center justify-between gap-2 mb-3">
            <Text className="text-sm font-semibold text-foreground flex-1">Category</Text>
            <Badge variant="secondary" className="shrink-0">
              <Text className="text-xs font-medium">Required</Text>
            </Badge>
          </View>
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <View className="border border-border rounded-xl overflow-hidden">
                {categoriesLoading ? (
                  <View className="p-4">
                    <Skeleton className="h-10 w-full" />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="p-3"
                    scrollEnabled={categories && categories.length > 0}
                  >
                    <View className="flex-row gap-2">
                      {categories?.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => onChange(category.id)}
                          className={cn(
                            'px-4 py-3 rounded-full border-2',
                            value === category.id
                              ? 'bg-primary border-primary'
                              : 'bg-card border-border'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-sm font-semibold',
                              value === category.id
                                ? 'text-primary-foreground'
                                : 'text-foreground'
                            )}
                          >
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
            <Text className="text-destructive text-xs mt-1.5 font-medium">
              ✕ {errors.category.message}
            </Text>
          )}
        </View>

        {/* Subcategory Selection */}
        <View>
          <View className="flex-row items-center justify-between gap-2 mb-3">
            <Text className="text-sm font-semibold text-foreground flex-1">Subcategory</Text>
            <Badge variant="secondary" className="shrink-0">
              <Text className="text-xs font-medium">Required</Text>
            </Badge>
          </View>
          <Controller
            control={control}
            name="subcategory"
            render={({ field: { onChange, value } }) => (
              <View className="border border-border rounded-xl overflow-hidden">
                {subcategoriesLoading ? (
                  <View className="p-4">
                    <Skeleton className="h-10 w-full" />
                  </View>
                ) : subcategories && subcategories.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="p-3"
                    scrollEnabled={true}
                  >
                    <View className="flex-row gap-2">
                      {subcategories.map((subcategory) => (
                        <TouchableOpacity
                          key={subcategory.id}
                          onPress={() => onChange(subcategory.id)}
                          className={cn(
                            'px-4 py-3 rounded-full border-2',
                            value === subcategory.id
                              ? 'bg-primary border-primary'
                              : 'bg-card border-border'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-sm font-semibold',
                              value === subcategory.id
                                ? 'text-primary-foreground'
                                : 'text-foreground'
                            )}
                          >
                            {subcategory.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <View className="p-4">
                    <Text className="text-xs text-muted-foreground">
                      Select a category first to see subcategories
                    </Text>
                  </View>
                )}
              </View>
            )}
          />
          {errors.subcategory && (
            <Text className="text-destructive text-xs mt-1.5 font-medium">
              ✕ {errors.subcategory.message}
            </Text>
          )}
        </View>
      </CardContent>
    </Card>
  );
});

ServiceDetailsSection.displayName = 'ServiceDetailsSection';

export const PricingSection = React.memo(({
  control,
  errors
}: FormSectionProps) => {
  return (
    <Card className="mt-4 mx-1">
      <CardHeader className="pb-2">
        <View className="flex-row items-center gap-3">
          <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
            <Text className="text-sm font-bold text-primary-foreground">2</Text>
          </View>
          <CardTitle>Pricing</CardTitle>
        </View>
      </CardHeader>
      <CardContent className="gap-4 pt-0 px-3 pb-3">
        {/* Base Price */}
        <View>
          <View className="flex-row items-center justify-between gap-2 mb-2">
            <Text className="text-sm font-semibold text-foreground flex-1">Base Price (£)</Text>
            <Badge variant="secondary" className="shrink-0">
              <Text className="text-xs font-medium">Required</Text>
            </Badge>
          </View>
          <Controller
            control={control}
            name="price"
            render={({ field: { onChange, value } }) => (
              <>
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className={cn('mb-1.5', errors.price && 'border-destructive')}
                />
                {!errors.price && (
                  <Text className="text-xs text-muted-foreground mt-1.5">
                    Starting price for your service
                  </Text>
                )}
              </>
            )}
          />
          {errors.price && (
            <Text className="text-destructive text-xs mt-1.5 font-medium">
              ✕ {errors.price.message}
            </Text>
          )}
        </View>

        {/* Price Type */}
        <View>
          <Text className="text-sm font-semibold text-foreground mb-2">Price Type</Text>
          <Controller
            control={control}
            name="priceType"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => onChange('fixed')}
                  className={cn(
                    'flex-1 py-3 rounded-lg border-2 items-center justify-center',
                    value === 'fixed'
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-bold',
                      value === 'fixed'
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                    )}
                  >
                    Fixed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onChange('hourly')}
                  className={cn(
                    'flex-1 py-3 rounded-lg border-2 items-center justify-center',
                    value === 'hourly'
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-bold',
                      value === 'hourly'
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                    )}
                  >
                    Hourly
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>

        {/* Duration - Full Width */}
        <View>
          <View className="flex-row items-center justify-between gap-2 mb-2">
            <Text className="text-sm font-semibold text-foreground flex-1">Duration</Text>
            <Badge variant="secondary" className="shrink-0">
              <Text className="text-xs font-medium">Required</Text>
            </Badge>
          </View>
          <Controller
            control={control}
            name="duration"
            render={({ field: { onChange, value } }) => (
              <>
                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="60"
                  keyboardType="decimal-pad"
                  className={cn('mb-1.5', errors.duration && 'border-destructive')}
                />
                {!errors.duration && (
                  <Text className="text-xs text-muted-foreground mt-1.5">
                    Service duration in minutes
                  </Text>
                )}
              </>
            )}
          />
          {errors.duration && (
            <Text className="text-destructive text-xs mt-1.5 font-medium">
              ✕ {errors.duration.message}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View className="h-px bg-border my-1.5" />

        {/* Optional Pricing Options */}
        <View className="gap-3">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Optional Add-ons
          </Text>

          {/* Deposit */}
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">
              Deposit Required (%)
            </Text>
            <Controller
              control={control}
              name="depositPercentage"
              render={({ field: { onChange, value } }) => (
                <>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="20"
                    keyboardType="decimal-pad"
                    className="mb-1.5"
                  />
                  <Text className="text-xs text-muted-foreground mt-1.5">
                    Leave empty for no deposit requirement
                  </Text>
                </>
              )}
            />
          </View>

          {/* House Call Fee */}
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">
              House Call Fee (£)
            </Text>
            <Controller
              control={control}
              name="houseCallExtraFee"
              render={({ field: { onChange, value } }) => (
                <>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className="mb-1.5"
                  />
                  <Text className="text-xs text-muted-foreground mt-1.5">
                    Extra charge for travel to customer location
                  </Text>
                </>
              )}
            />
          </View>
        </View>
      </CardContent>
    </Card>
  );
});

PricingSection.displayName = 'PricingSection';

export const ServiceSettingsSection = React.memo(({
  control,
  errors
}: FormSectionProps) => {
  return (
    <Card className="mt-4 mx-1">
      <CardHeader className="pb-2">
        <View className="flex-row items-center gap-3">
          <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
            <Text className="text-sm font-bold text-primary-foreground">3</Text>
          </View>
          <CardTitle>Settings & Availability</CardTitle>
        </View>
      </CardHeader>
      <CardContent className="gap-4 pt-0 px-3 pb-3">
        {/* Cancellation Policy */}
        <View>
          <Text className="text-sm font-semibold text-foreground mb-2">
            Cancellation Policy
          </Text>
          <Controller
            control={control}
            name="cancellationPolicy"
            render={({ field: { onChange, value } }) => (
              <>
                <Textarea
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g., Free cancellation up to 24 hours before..."
                  className="min-h-[80px] mb-1.5"
                />
                <Text className="text-xs text-muted-foreground mt-1.5">
                  Help customers understand your cancellation terms
                </Text>
              </>
            )}
          />
        </View>

        {/* Divider */}
        <View className="h-px bg-border my-1.5" />

        {/* Service Availability Toggles */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Availability Options
          </Text>

          {/* House Call Available */}
          <View className="flex-row items-center justify-between p-3 rounded-lg bg-card border border-border">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-foreground mb-0.5">
                House Call Available
              </Text>
              <Text className="text-xs text-muted-foreground">
                Offer at customer's location
              </Text>
            </View>
            <Controller
              control={control}
              name="houseCallAvailable"
              render={({ field: { onChange, value } }) => (
                <Switch checked={value} onCheckedChange={onChange} />
              )}
            />
          </View>

          {/* Allow SOS Bookings */}
          <View className="flex-row items-center justify-between p-3 rounded-lg bg-card border border-border">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-foreground mb-0.5">
                Allow SOS Bookings
              </Text>
              <Text className="text-xs text-muted-foreground">
                Accept urgent same-day requests
              </Text>
            </View>
            <Controller
              control={control}
              name="allowsSosBooking"
              render={({ field: { onChange, value } }) => (
                <Switch checked={value} onCheckedChange={onChange} />
              )}
            />
          </View>

          {/* Service Status */}
          <View className="flex-row items-center justify-between p-3 rounded-lg bg-primary/8 border border-primary/30">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-foreground mb-0.5">
                Service Status
              </Text>
              <Text className="text-xs text-muted-foreground">
                Enable to make visible & bookable
              </Text>
            </View>
            <Controller
              control={control}
              name="isActive"
              render={({ field: { onChange, value } }) => (
                <Switch checked={value} onCheckedChange={onChange} />
              )}
            />
          </View>
        </View>
      </CardContent>
    </Card>
  );
});

ServiceSettingsSection.displayName = 'ServiceSettingsSection';
