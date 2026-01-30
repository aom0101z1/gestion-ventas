// GPSService - Handles GPS location for attendance validation
// Implements strict mode: must be within 500m of class location

import Geolocation from 'react-native-geolocation-service';
import {Platform, PermissionsAndroid} from 'react-native';
import {GPS_CONFIG, GPS_ERRORS} from '../config/gps.config';
import {GPSData, ClassLocation} from '../types';

interface GPSValidationResult {
  isValid: boolean;
  reason?: string;
  distance?: number;
  gpsData?: GPSData;
}

class GPSServiceClass {
  private hasPermission: boolean = false;

  // Request location permission
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de Ubicación',
          message:
            'TutorBoxCRM necesita acceso a tu ubicación para registrar asistencia.',
          buttonNeutral: 'Preguntar después',
          buttonNegative: 'Cancelar',
          buttonPositive: 'Aceptar',
        },
      );
      this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      return this.hasPermission;
    }

    return false;
  }

  // Get current location
  async getCurrentLocation(): Promise<GPSData> {
    // Check permission first
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error(GPS_ERRORS.PERMISSION_DENIED);
      }
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          const gpsData: GPSData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
          };
          console.log('📍 GPS location obtained:', gpsData);
          resolve(gpsData);
        },
        error => {
          console.error('GPS error:', error);
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              reject(new Error(GPS_ERRORS.PERMISSION_DENIED));
              break;
            case 2: // POSITION_UNAVAILABLE
              reject(new Error(GPS_ERRORS.POSITION_UNAVAILABLE));
              break;
            case 3: // TIMEOUT
              reject(new Error(GPS_ERRORS.TIMEOUT));
              break;
            default:
              reject(new Error(GPS_ERRORS.POSITION_UNAVAILABLE));
          }
        },
        {
          enableHighAccuracy: GPS_CONFIG.HIGH_ACCURACY,
          timeout: GPS_CONFIG.TIMEOUT_MS,
          maximumAge: GPS_CONFIG.MAXIMUM_AGE_MS,
        },
      );
    });
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Validate GPS data for attendance
  validateForAttendance(
    gpsData: GPSData,
    classLocation: ClassLocation,
  ): GPSValidationResult {
    // 1. Check GPS accuracy
    if (gpsData.accuracy > GPS_CONFIG.MIN_ACCURACY_METERS) {
      return {
        isValid: false,
        reason: `${GPS_ERRORS.LOW_ACCURACY} (${Math.round(gpsData.accuracy)}m)`,
        gpsData,
      };
    }

    // 2. Check timestamp age
    const age = Date.now() - new Date(gpsData.timestamp).getTime();
    if (age > GPS_CONFIG.MAX_LOCATION_AGE_MS) {
      return {
        isValid: false,
        reason: GPS_ERRORS.LOCATION_STALE,
        gpsData,
      };
    }

    // 3. Calculate distance to class location
    const distance = this.calculateDistance(
      gpsData.latitude,
      gpsData.longitude,
      classLocation.latitude,
      classLocation.longitude,
    );

    // 4. Check if within allowed radius (STRICT MODE)
    const allowedRadius =
      classLocation.radius || GPS_CONFIG.REQUIRED_RADIUS_METERS;

    if (distance > allowedRadius) {
      return {
        isValid: false,
        reason: `${GPS_ERRORS.TOO_FAR} (${Math.round(distance)}m de ${classLocation.name})`,
        distance: Math.round(distance),
        gpsData: {
          ...gpsData,
          isValid: false,
          validationReason: 'too_far',
          distanceToLocation: Math.round(distance),
        },
      };
    }

    // All validations passed
    return {
      isValid: true,
      distance: Math.round(distance),
      gpsData: {
        ...gpsData,
        isValid: true,
        distanceToLocation: Math.round(distance),
      },
    };
  }

  // Full validation flow: get location + validate
  async validateLocationForAttendance(
    classLocation: ClassLocation,
  ): Promise<GPSValidationResult> {
    try {
      const gpsData = await this.getCurrentLocation();
      return this.validateForAttendance(gpsData, classLocation);
    } catch (error: any) {
      return {
        isValid: false,
        reason: error.message || GPS_ERRORS.POSITION_UNAVAILABLE,
      };
    }
  }

  // Check if GPS permission is granted
  async checkPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      this.hasPermission = status === 'granted';
    } else if (Platform.OS === 'android') {
      this.hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
    }
    return this.hasPermission;
  }
}

// Export singleton instance
export const GPSService = new GPSServiceClass();
