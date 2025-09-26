/**
 * AsyncStorage debugging utility for ZOVA
 * This utility helps inspect all data stored in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageItem {
  key: string;
  value: any;
  size: number;
  type: string;
}

export class AsyncStorageDebugger {
  /**
   * Get all keys in AsyncStorage
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys].sort();
    } catch (error) {
      console.error('Failed to get AsyncStorage keys:', error);
      return [];
    }
  }

  /**
   * Get all data from AsyncStorage
   */
  static async getAllData(): Promise<StorageItem[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items: StorageItem[] = [];

      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          let parsedValue: any = value;
          let type = 'string';

          // Try to parse JSON
          if (value) {
            try {
              parsedValue = JSON.parse(value);
              type = typeof parsedValue === 'object' ? 'object' : typeof parsedValue;
            } catch {
              // Keep as string if not valid JSON
              type = 'string';
            }
          }

          items.push({
            key,
            value: parsedValue,
            size: value?.length || 0,
            type,
          });
        } catch (error) {
          console.error(`Failed to get value for key ${key}:`, error);
        }
      }

      return items.sort((a, b) => a.key.localeCompare(b.key));
    } catch (error) {
      console.error('Failed to get all AsyncStorage data:', error);
      return [];
    }
  }

  /**
   * Print all AsyncStorage data to console with formatting
   */
  static async printAllData(): Promise<void> {
    console.group('📱 AsyncStorage Contents');
    
    try {
      const items = await this.getAllData();
      
      if (items.length === 0) {
        console.log('🔍 No data found in AsyncStorage');
        console.groupEnd();
        return;
      }

      console.log(`📊 Found ${items.length} items:`);
      console.log('');

      items.forEach((item, index) => {
        console.group(`${index + 1}. ${item.key} (${item.type}, ${item.size} chars)`);
        
        if (item.type === 'object') {
          console.log('Value:', JSON.stringify(item.value, null, 2));
        } else {
          console.log('Value:', item.value);
        }
        
        console.groupEnd();
      });

      // Summary
      console.log('');
      console.log('📈 Summary:');
      console.log(`Total items: ${items.length}`);
      console.log(`Total size: ${items.reduce((sum, item) => sum + item.size, 0)} characters`);
      
      // Group by type
      const typeGroups = items.reduce((groups, item) => {
        groups[item.type] = (groups[item.type] || 0) + 1;
        return groups;
      }, {} as Record<string, number>);
      
      console.log('Types:', typeGroups);

    } catch (error) {
      console.error('Error printing AsyncStorage data:', error);
    }
    
    console.groupEnd();
  }

  /**
   * Print specific ZOVA-related data
   */
  static async printZovaData(): Promise<void> {
    console.group('🏢 ZOVA App Data');
    
    try {
      const items = await this.getAllData();
      const zovaItems = items.filter(item => 
        item.key.includes('zova') || 
        item.key.includes('onboarding') ||
        item.key.includes('theme') ||
        item.key.includes('app') ||
        item.key.includes('error') ||
        item.key.includes('user') ||
        item.key.includes('provider') ||
        item.key.includes('auth')
      );

      if (zovaItems.length === 0) {
        console.log('🔍 No ZOVA-specific data found');
        console.groupEnd();
        return;
      }

      console.log(`📊 Found ${zovaItems.length} ZOVA-related items:`);
      console.log('');

      zovaItems.forEach((item, index) => {
        console.group(`${index + 1}. ${item.key}`);
        
        if (item.type === 'object') {
          console.log(JSON.stringify(item.value, null, 2));
        } else {
          console.log(item.value);
        }
        
        console.groupEnd();
      });

    } catch (error) {
      console.error('Error printing ZOVA data:', error);
    }
    
    console.groupEnd();
  }

  /**
   * Clear all AsyncStorage data (use with caution!)
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('🗑️ All AsyncStorage data cleared');
    } catch (error) {
      console.error('Failed to clear AsyncStorage:', error);
    }
  }

  /**
   * Clear specific keys
   */
  static async clearKeys(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
      console.log(`🗑️ Cleared keys: ${keys.join(', ')}`);
    } catch (error) {
      console.error('Failed to clear specific keys:', error);
    }
  }

  /**
   * Export all data as JSON
   */
  static async exportData(): Promise<Record<string, any>> {
    try {
      const items = await this.getAllData();
      const exportData: Record<string, any> = {};
      
      items.forEach(item => {
        exportData[item.key] = item.value;
      });

      return exportData;
    } catch (error) {
      console.error('Failed to export data:', error);
      return {};
    }
  }
}

// Convenience functions for easy usage
export const printAsyncStorage = () => AsyncStorageDebugger.printAllData();
export const printZovaData = () => AsyncStorageDebugger.printZovaData();
export const getAllStorageKeys = () => AsyncStorageDebugger.getAllKeys();
export const getAllStorageData = () => AsyncStorageDebugger.getAllData();
export const exportStorageData = () => AsyncStorageDebugger.exportData();