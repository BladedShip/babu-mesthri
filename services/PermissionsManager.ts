import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Camera } from 'react-native-vision-camera';
import * as Location from 'expo-location';

export type AppPermission = 'camera' | 'contacts' | 'calendar' | 'location';

export class PermissionsManager {
  static async checkPermission(type: AppPermission): Promise<boolean> {
    if (type === 'camera') {
      const status = Camera.getCameraPermissionStatus();
      return status === 'granted';
    }
    if (type === 'location') {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    }

    if (Platform.OS === 'ios') {
      switch(type) {
        case 'contacts':
          return await check(PERMISSIONS.IOS.CONTACTS) === RESULTS.GRANTED;
        case 'calendar':
          return await check(PERMISSIONS.IOS.CALENDARS) === RESULTS.GRANTED;
      }
    } else if (Platform.OS === 'android') {
      switch(type) {
        case 'contacts':
          return await check(PERMISSIONS.ANDROID.READ_CONTACTS) === RESULTS.GRANTED;
        case 'calendar':
          return await check(PERMISSIONS.ANDROID.READ_CALENDAR) === RESULTS.GRANTED;
      }
    }
    return false;
  }

  static async requestPermission(type: AppPermission): Promise<boolean> {
    if (type === 'camera') {
      const newStatus = await Camera.requestCameraPermission();
      return newStatus === 'granted';
    }
    if (type === 'location') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    }

    if (Platform.OS === 'ios') {
      switch(type) {
        case 'contacts':
          return await request(PERMISSIONS.IOS.CONTACTS) === RESULTS.GRANTED;
        case 'calendar':
          return await request(PERMISSIONS.IOS.CALENDARS) === RESULTS.GRANTED;
      }
    } else if (Platform.OS === 'android') {
      switch(type) {
        case 'contacts':
          return await request(PERMISSIONS.ANDROID.READ_CONTACTS) === RESULTS.GRANTED;
        case 'calendar':
          return await request(PERMISSIONS.ANDROID.READ_CALENDAR) === RESULTS.GRANTED;
      }
    }
    return false;
  }
}
