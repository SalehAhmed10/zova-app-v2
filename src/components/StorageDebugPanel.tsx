/**
 * Debug Panel for AsyncStorage inspection
 * Add this component temporarily to any screen to debug storage
 */

import React from 'react';
import { View, Pressable, Text, Alert } from 'react-native';
import { AsyncStorageDebugger } from '../lib/storage-debugger';
import clearAllAppData from '@/utils/clear-app-data';
import { useAppStore } from '@/stores/app';

export function StorageDebugPanel() {
  const { reset } = useAppStore();

  const handlePrintAll = async () => {
    console.log('🔍 Printing all AsyncStorage data...');
    await AsyncStorageDebugger.printAllData();
  };

  const handlePrintZova = async () => {
    console.log('🔍 Printing ZOVA-specific data...');
    await AsyncStorageDebugger.printZovaData();
  };

  const handleExport = async () => {
    console.log('📤 Exporting AsyncStorage data...');
    const data = await AsyncStorageDebugger.exportData();
    console.log('Exported data:', JSON.stringify(data, null, 2));
  };

  const handleClearErrors = async () => {
    console.log('🗑️ Clearing error reports...');
    await AsyncStorageDebugger.clearKeys(['zova_error_reports']);
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All App Data',
      'This will clear all stored data and reset the app. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            console.log('🧹 Clearing all app data...');
            await clearAllAppData();
            reset(); // Reset app store state
            console.log('✅ All data cleared. Please restart the app.');
          }
        }
      ]
    );
  };

  return (
    <View style={{
      position: 'absolute',
      bottom: 100,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 15,
      borderRadius: 10,
      zIndex: 1000,
    }}>
      <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 10 }}>
        Storage Debug
      </Text>
      
      <Pressable
        onPress={handlePrintAll}
        style={{
          backgroundColor: '#007AFF',
          padding: 8,
          borderRadius: 5,
          marginBottom: 5,
        }}
      >
        <Text style={{ color: 'white', fontSize: 12 }}>Print All</Text>
      </Pressable>

      <Pressable
        onPress={handlePrintZova}
        style={{
          backgroundColor: '#34C759',
          padding: 8,
          borderRadius: 5,
          marginBottom: 5,
        }}
      >
        <Text style={{ color: 'white', fontSize: 12 }}>Print ZOVA</Text>
      </Pressable>

      <Pressable
        onPress={handleExport}
        style={{
          backgroundColor: '#FF9500',
          padding: 8,
          borderRadius: 5,
          marginBottom: 5,
        }}
      >
        <Text style={{ color: 'white', fontSize: 12 }}>Export JSON</Text>
      </Pressable>

      <Pressable
        onPress={handleClearErrors}
        style={{
          backgroundColor: '#FF3B30',
          padding: 8,
          borderRadius: 5,
          marginBottom: 5,
        }}
      >
        <Text style={{ color: 'white', fontSize: 12 }}>Clear Errors</Text>
      </Pressable>

      <Pressable
        onPress={handleClearAllData}
        style={{
          backgroundColor: '#8E44AD',
          padding: 8,
          borderRadius: 5,
        }}
      >
        <Text style={{ color: 'white', fontSize: 12 }}>🧹 Clear All Data</Text>
      </Pressable>
    </View>
  );
}