import React from 'react';
import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ProviderProfileSkeleton = () => {
  return (
    <View className="flex-1 bg-background">
      {/* Header Skeleton */}
      <View className="px-4 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-32 h-6 rounded" />
          <View className="w-6" />
        </View>
      </View>

      {/* Provider Info Card Skeleton */}
      <View className="px-4 py-6">
        <Card className="bg-card border border-border/50">
          <CardContent className="p-6">
            <View className="items-center mb-6">
              {/* Avatar Skeleton */}
              <Skeleton className="w-24 h-24 rounded-full mb-4" />

              {/* Name Skeleton */}
              <Skeleton className="w-48 h-8 rounded mb-2" />
              <Skeleton className="w-32 h-5 rounded mb-4" />

              {/* Rating and Verification Skeleton */}
              <View className="flex-row items-center mb-4">
                <Skeleton className="w-16 h-5 rounded mr-2" />
                <Skeleton className="w-20 h-4 rounded" />
                <View className="ml-2 flex-row items-center">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="w-12 h-4 rounded ml-1" />
                </View>
              </View>

              {/* Info Items Skeleton */}
              <View className="w-full gap-2 mb-6">
                <Skeleton className="w-full h-4 rounded" />
                <Skeleton className="w-3/4 h-4 rounded" />
                <Skeleton className="w-2/3 h-4 rounded" />
                <Skeleton className="w-1/2 h-4 rounded" />
              </View>
            </View>

            {/* Bio Skeleton */}
            <View className="mb-6 gap-2">
              <Skeleton className="w-full h-4 rounded" />
              <Skeleton className="w-full h-4 rounded" />
              <Skeleton className="w-3/4 h-4 rounded" />
            </View>

            {/* Action Buttons Skeleton */}
            <View className="flex-row gap-3 mb-6">
              <Skeleton className="flex-1 h-12 rounded" />
              <Skeleton className="flex-1 h-12 rounded" />
            </View>

            {/* Additional Info Skeleton */}
            <View className="mb-6 gap-3">
              <Skeleton className="w-20 h-4 rounded" />
              <View className="flex-row gap-2">
                <Skeleton className="w-16 h-6 rounded-full" />
                <Skeleton className="w-20 h-6 rounded-full" />
                <Skeleton className="w-18 h-6 rounded-full" />
              </View>
            </View>

            {/* Contact Information Skeleton */}
            <View className="border-t border-border pt-4 gap-3">
              <Skeleton className="w-32 h-4 rounded mb-3" />
              <Skeleton className="w-full h-4 rounded" />
              <Skeleton className="w-4/5 h-4 rounded" />
              <Skeleton className="w-3/4 h-4 rounded" />
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Working Hours Section Skeleton */}
      <View className="px-4 pb-6">
        <Skeleton className="w-32 h-6 rounded mb-4" />
        <Card className="bg-card border border-border/50">
          <CardContent className="p-4 gap-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <View key={index} className="flex-row justify-between items-center">
                <Skeleton className="w-20 h-4 rounded" />
                <Skeleton className="w-24 h-4 rounded" />
              </View>
            ))}
          </CardContent>
        </Card>
      </View>

      {/* Services Section Skeleton */}
      <View className="px-4 pb-6">
        <Skeleton className="w-40 h-6 rounded mb-4" />
        <View className="gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="bg-card border border-border/50">
              <CardContent className="p-4">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 mr-4 gap-2">
                    <Skeleton className="w-3/4 h-5 rounded" />
                    <Skeleton className="w-full h-4 rounded" />
                    <Skeleton className="w-full h-4 rounded" />
                    <View className="flex-row gap-2 mt-2">
                      <Skeleton className="w-16 h-5 rounded" />
                      <Skeleton className="w-20 h-5 rounded" />
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <Skeleton className="w-16 h-5 rounded" />
                    <Skeleton className="w-12 h-4 rounded" />
                  </View>
                </View>
                <Skeleton className="w-full h-10 rounded" />
              </CardContent>
            </Card>
          ))}
        </View>
      </View>
    </View>
  );
};