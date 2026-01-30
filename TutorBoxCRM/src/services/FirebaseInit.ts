// Firebase Initialization Service
// Ensures Firebase is properly initialized before use

import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';

let isInitialized = false;

export const initializeFirebase = async (): Promise<void> => {
  if (isInitialized) {
    console.log('🔥 Firebase already initialized');
    return;
  }

  try {
    // With @react-native-firebase, the app auto-initializes from google-services.json
    // We just need to verify the default app exists
    const app = firebase.app();
    console.log('🔥 Firebase app name:', app.name);
    console.log('🔥 Firebase project:', app.options.projectId);

    // Verify auth and database are accessible
    const authInstance = auth();
    const dbInstance = database();

    console.log('🔥 Auth instance ready');
    console.log('🔥 Database URL:', dbInstance.app.options.databaseURL);

    isInitialized = true;
    console.log('🔥 Firebase ready');
  } catch (error: any) {
    console.error('🔥 Firebase initialization error:', error);
    console.error('🔥 Error code:', error.code);
    console.error('🔥 Error message:', error.message);
    throw error;
  }
};

export const isFirebaseInitialized = (): boolean => isInitialized;
