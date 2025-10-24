import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Set default notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useLocalNotification = () => {
  // Skip notifications on web platform
  if (Platform.OS === 'web') {
    return {
      sendLocalNotification: async () => ({ success: false }),
    };
  }

  /**
   * Send a local notification immediately
   */
  const sendLocalNotification = async (title: string, body: string) => {
    try {
      // Request permissions if needed
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Notification permissions not granted');
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: null, // Show immediately
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error sending local notification:', error);
      throw error;
    }
  };

  return {
    sendLocalNotification, // Usage: sendLocalNotification('Title', 'Body')
  };
};

// Export alias for backward compatibility
export const usePushNotification = useLocalNotification;
