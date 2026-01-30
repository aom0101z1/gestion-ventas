// GroupService - Manages groups (grupos2) data
// Fetches groups from Firebase, filters by teacher

import database from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DB_PATHS} from '../config/firebase.config';
import {Group, ClassLocation} from '../types';
import {AuthService} from './AuthService';

const GROUPS_CACHE_KEY = '@tutorbox_crm_groups_cache';
const LOCATIONS_CACHE_KEY = '@tutorbox_crm_locations_cache';

class GroupServiceClass {
  private groups: Map<number, Group> = new Map();
  private classLocations: Map<string, ClassLocation> = new Map();
  private groupsListener: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Load cached data first
    await this.loadFromCache();

    // Setup real-time listener for groups
    this.setupGroupsListener();

    // Load class locations
    await this.loadClassLocations();

    console.log('👥 GroupService initialized, groups:', this.groups.size);
  }

  private setupGroupsListener(): void {
    const ref = database().ref(DB_PATHS.GROUPS);

    this.groupsListener = ref.on('value', snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        this.groups.clear();

        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value && value.status === 'active') {
            this.groups.set(value.groupId || parseInt(key), value as Group);
          }
        });

        this.saveToCache();
        console.log('👥 Groups updated:', this.groups.size);
      }
    }) as any;
  }

  // Load class locations for GPS validation
  async loadClassLocations(): Promise<void> {
    try {
      const snapshot = await database()
        .ref(DB_PATHS.CLASS_LOCATIONS)
        .once('value');

      if (snapshot.exists()) {
        const data = snapshot.val();
        this.classLocations.clear();

        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value && value.active !== false) {
            this.classLocations.set(key, {
              id: key,
              ...value,
            } as ClassLocation);
          }
        });

        console.log('📍 Class locations loaded:', this.classLocations.size);
      } else {
        console.log('📍 No class locations configured yet');
      }
    } catch (error: any) {
      // Handle permission denied gracefully - classLocations might not be set up yet
      if (error?.code === 'database/permission-denied') {
        console.warn('📍 Class locations: permission denied - check Firebase rules or create /classLocations node');
      } else {
        console.error('Error loading class locations:', error);
      }
      // Continue without class locations - GPS validation will use defaults
    }
  }

  // Get all groups
  getAllGroups(): Group[] {
    return Array.from(this.groups.values());
  }

  // Get groups for current teacher
  getMyGroups(): Group[] {
    const teacherId = AuthService.getTeacherId();
    const role = AuthService.getRole();

    // Directors and admins see all groups
    if (role === 'admin' || role === 'director') {
      return this.getAllGroups();
    }

    // Teachers only see their assigned groups
    if (teacherId) {
      return Array.from(this.groups.values()).filter(
        g => g.teacherId === teacherId,
      );
    }

    return [];
  }

  // Get group by ID
  getGroupById(groupId: number): Group | undefined {
    return this.groups.get(groupId);
  }

  // Get today's groups (based on day of week)
  getTodaysGroups(): Group[] {
    const today = new Date();
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const todayName = days[today.getDay()];

    return this.getMyGroups().filter(g => g.days?.includes(todayName));
  }

  // Get class location for GPS validation
  getClassLocation(locationId: string): ClassLocation | undefined {
    return this.classLocations.get(locationId);
  }

  // Get default class location (first one if no specific location)
  getDefaultClassLocation(): ClassLocation | undefined {
    const locations = Array.from(this.classLocations.values());
    return locations.length > 0 ? locations[0] : undefined;
  }

  // Get all class locations
  getAllClassLocations(): ClassLocation[] {
    return Array.from(this.classLocations.values());
  }

  // Get students in a group
  getGroupStudents(groupId: number): string[] {
    const group = this.groups.get(groupId);
    return group?.studentIds || [];
  }

  // Save to cache
  private async saveToCache(): Promise<void> {
    try {
      const groupsArray = Array.from(this.groups.entries());
      await AsyncStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(groupsArray));
    } catch (error) {
      console.error('Error saving groups cache:', error);
    }
  }

  // Load from cache
  private async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(GROUPS_CACHE_KEY);
      if (cached) {
        const groupsArray = JSON.parse(cached);
        this.groups = new Map(groupsArray);
        console.log('💾 Loaded groups from cache:', this.groups.size);
      }
    } catch (error) {
      console.error('Error loading groups cache:', error);
    }
  }

  // Refresh groups from Firebase
  async refresh(): Promise<void> {
    try {
      const snapshot = await database().ref(DB_PATHS.GROUPS).once('value');

      if (snapshot.exists()) {
        const data = snapshot.val();
        this.groups.clear();

        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value && value.status === 'active') {
            this.groups.set(value.groupId || parseInt(key), value as Group);
          }
        });

        await this.saveToCache();
      }
    } catch (error) {
      console.error('Error refreshing groups:', error);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.groupsListener) {
      database().ref(DB_PATHS.GROUPS).off('value', this.groupsListener as any);
      this.groupsListener = null;
    }
    this.groups.clear();
    this.classLocations.clear();
  }
}

// Export singleton instance
export const GroupService = new GroupServiceClass();
