// AuthContext - Provides authentication state to the app
// Minimal context following Talky pattern - auth state only

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import {AuthService} from '../services/AuthService';
import {NetworkService} from '../services/NetworkService';
import {GroupService} from '../services/GroupService';
import {StudentService} from '../services/StudentService';
import {AttendanceService} from '../services/AttendanceService';
import {OfflineSyncService} from '../services/OfflineSyncService';
import {User} from '../types';
import {UserRole} from '../config/permissions.config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConnected: boolean;
  // Auth methods
  login: (
    email: string,
    password: string,
  ) => Promise<{success: boolean; error?: string}>;
  logout: () => Promise<void>;
  sendPasswordReset: (
    email: string,
  ) => Promise<{success: boolean; error?: string}>;
  // Helper methods
  isAuthenticated: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isDirector: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({children}: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const servicesInitialized = useRef(false);

  useEffect(() => {
    // Initialize core services
    const initializeCoreServices = async () => {
      try {
        // Initialize network service
        await NetworkService.initialize();
        setIsConnected(NetworkService.getIsConnected());

        // Initialize auth service
        await AuthService.initialize();

        // Initialize offline sync service (needs to be ready for queuing)
        await OfflineSyncService.initialize();

        console.log('✅ Core services initialized');
      } catch (error) {
        console.error('Error initializing core services:', error);
      }
    };

    initializeCoreServices();

    // Subscribe to auth changes
    const authUnsubscribe = AuthService.addListener(newUser => {
      setUser(newUser);
      setLoading(false);
    });

    // Subscribe to network changes
    const networkUnsubscribe = NetworkService.addListener(connected => {
      setIsConnected(connected);
    });

    // Cleanup
    return () => {
      authUnsubscribe();
      networkUnsubscribe();
      // Destroy data services on unmount
      GroupService.destroy();
      StudentService.destroy();
    };
  }, []);

  // Initialize data services when user is authenticated
  useEffect(() => {
    const initializeDataServices = async () => {
      if (user && !servicesInitialized.current) {
        try {
          console.log('📦 Initializing data services for user:', user.profile.name);

          // Initialize all data services
          await Promise.all([
            GroupService.initialize(),
            StudentService.initialize(),
            AttendanceService.initialize(),
          ]);

          servicesInitialized.current = true;
          console.log('✅ Data services initialized');
        } catch (error) {
          console.error('Error initializing data services:', error);
        }
      } else if (!user && servicesInitialized.current) {
        // User logged out, cleanup services
        GroupService.destroy();
        StudentService.destroy();
        servicesInitialized.current = false;
        console.log('🧹 Data services cleaned up');
      }
    };

    initializeDataServices();
  }, [user]);

  const login = async (
    email: string,
    password: string,
  ): Promise<{success: boolean; error?: string}> => {
    return AuthService.login(email, password);
  };

  const logout = async (): Promise<void> => {
    return AuthService.logout();
  };

  const sendPasswordReset = async (
    email: string,
  ): Promise<{success: boolean; error?: string}> => {
    return AuthService.sendPasswordReset(email);
  };

  const value: AuthContextType = {
    user,
    loading,
    isConnected,
    login,
    logout,
    sendPasswordReset,
    isAuthenticated: user !== null,
    role: user?.profile.role || null,
    isAdmin: user?.profile.role === 'admin',
    isDirector: user?.profile.role === 'director',
    isTeacher: user?.profile.role === 'teacher',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
