// AuthService - Handles Firebase Authentication
// Manages login, logout, and user profile loading

import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import {User, UserProfile} from '../types';
import {UserRole} from '../config/permissions.config';
import {DB_PATHS} from '../config/firebase.config';

type AuthStateListener = (user: User | null) => void;

class AuthServiceClass {
  private currentUser: User | null = null;
  private listeners: Set<AuthStateListener> = new Set();
  private authUnsubscribe: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Subscribe to auth state changes
    this.authUnsubscribe = auth().onAuthStateChanged(
      this.handleAuthStateChange,
    );
    console.log('🔐 AuthService initialized');
  }

  private handleAuthStateChange = async (
    firebaseUser: FirebaseAuthTypes.User | null,
  ): Promise<void> => {
    if (firebaseUser) {
      // User is signed in - load profile
      try {
        const profile = await this.loadUserProfile(firebaseUser.uid);
        if (profile) {
          this.currentUser = {
            uid: firebaseUser.uid,
            profile,
          };
          // Update last login
          await this.updateLastLogin(firebaseUser.uid);
        } else {
          // No profile found - sign out
          console.warn('⚠️ No user profile found for:', firebaseUser.uid);
          this.currentUser = null;
          await auth().signOut();
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        this.currentUser = null;
      }
    } else {
      // User is signed out
      this.currentUser = null;
    }

    this.notifyListeners();
  };

  private async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snapshot = await database()
        .ref(`${DB_PATHS.USERS}/${uid}/profile`)
        .once('value');

      if (snapshot.exists()) {
        return snapshot.val() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  private async updateLastLogin(uid: string): Promise<void> {
    try {
      await database()
        .ref(`${DB_PATHS.USERS}/${uid}/profile/lastLogin`)
        .set(new Date().toISOString());
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentUser);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  // Login with email and password
  async login(
    email: string,
    password: string,
  ): Promise<{success: boolean; error?: string}> {
    try {
      await auth().signInWithEmailAndPassword(email, password);
      return {success: true};
    } catch (error: any) {
      console.error('Login error:', error);

      // Map Firebase error codes to user-friendly messages
      let errorMessage = 'Error al iniciar sesión';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Usuario deshabilitado';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Intenta más tarde.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Error de conexión. Verifica tu internet.';
          break;
        default:
          errorMessage = error.message || 'Error desconocido';
      }

      return {success: false, error: errorMessage};
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await auth().signOut();
      this.currentUser = null;
      console.log('🔐 User logged out');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordReset(
    email: string,
  ): Promise<{success: boolean; error?: string}> {
    try {
      await auth().sendPasswordResetEmail(email);
      return {success: true};
    } catch (error: any) {
      let errorMessage = 'Error al enviar email';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        default:
          errorMessage = error.message || 'Error desconocido';
      }
      return {success: false, error: errorMessage};
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get user role
  getRole(): UserRole | null {
    return this.currentUser?.profile.role || null;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.currentUser?.profile.role === 'admin';
  }

  // Check if user is director
  isDirector(): boolean {
    return this.currentUser?.profile.role === 'director';
  }

  // Check if user is teacher
  isTeacher(): boolean {
    return this.currentUser?.profile.role === 'teacher';
  }

  // Subscribe to auth state changes
  addListener(listener: AuthStateListener): () => void {
    this.listeners.add(listener);

    // Immediately call with current state
    listener(this.currentUser);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get teacher ID if current user is a teacher
  getTeacherId(): string | null {
    return this.currentUser?.profile.teacherId || null;
  }

  // Cleanup
  destroy(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    this.listeners.clear();
    this.currentUser = null;
  }
}

// Export singleton instance
export const AuthService = new AuthServiceClass();
