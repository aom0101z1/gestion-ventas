/**
 * TutorBoxCRM - React Native Mobile App
 * Management app for Ciudad Bilingue CRM
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {StatusBar, useColorScheme, View, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {initializeFirebase} from './src/services/FirebaseInit';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        setIsFirebaseReady(true);
      } catch (error: any) {
        console.error('Failed to initialize Firebase:', error);
        setInitError(error.message || 'Error initializing Firebase');
      }
    };
    init();
  }, []);

  // Show loading while Firebase initializes
  if (!isFirebaseReady) {
    return (
      <View style={styles.loadingContainer}>
        {initError ? (
          <>
            <Text style={styles.errorText}>Error de Inicializacion</Text>
            <Text style={styles.errorDetail}>{initError}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Iniciando TutorBoxCRM...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="#667eea"
        />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default App;
