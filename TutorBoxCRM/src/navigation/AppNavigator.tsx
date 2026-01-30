// AppNavigator - Main navigation setup
// Handles auth flow and role-based navigation

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {ActivityIndicator, View, Text, StyleSheet, Platform} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {useAuth} from '../context/AuthContext';
import {RootStackParamList} from '../types';
import {hasModuleAccess} from '../config/permissions.config';
import {Colors, Shadows} from '../theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

// Attendance Screens
import AttendanceHomeScreen from '../screens/attendance/AttendanceHomeScreen';
import SelectGroupScreen from '../screens/attendance/SelectGroupScreen';
import TakeAttendanceScreen from '../screens/attendance/TakeAttendanceScreen';

// Student Screens
import StudentListScreen from '../screens/students/StudentListScreen';
import StudentDetailScreen from '../screens/students/StudentDetailScreen';
import StudentProgressScreen from '../screens/students/StudentProgressScreen';

// Payment Screens
import PaymentsHomeScreen from '../screens/payments/PaymentsHomeScreen';
import RecordPaymentScreen from '../screens/payments/RecordPaymentScreen';
import PaymentHistoryScreen from '../screens/payments/PaymentHistoryScreen';
import PendingPaymentsScreen from '../screens/payments/PendingPaymentsScreen';

// Report Screens
import ReportsHomeScreen from '../screens/reports/ReportsHomeScreen';
import AttendanceReportScreen from '../screens/reports/AttendanceReportScreen';
import PaymentReportScreen from '../screens/reports/PaymentReportScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import ModuleConfigScreen from '../screens/admin/ModuleConfigScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Auth Stack (Login flow)
function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Attendance Stack Navigator
function AttendanceStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AttendanceHome" component={AttendanceHomeScreen} />
      <Stack.Screen name="SelectGroup" component={SelectGroupScreen} />
      <Stack.Screen name="TakeAttendance" component={TakeAttendanceScreen} />
    </Stack.Navigator>
  );
}

// Students Stack Navigator
function StudentsStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="StudentList" component={StudentListScreen} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <Stack.Screen name="StudentProgress" component={StudentProgressScreen} />
    </Stack.Navigator>
  );
}

// Payments Stack Navigator
function PaymentsStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="PaymentsHome" component={PaymentsHomeScreen} />
      <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
    </Stack.Navigator>
  );
}

// Reports Stack Navigator
function ReportsStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="ReportsHome" component={ReportsHomeScreen} />
      <Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} />
      <Stack.Screen name="PaymentReport" component={PaymentReportScreen} />
    </Stack.Navigator>
  );
}

// Admin Stack Navigator
function AdminStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="ModuleConfig" component={ModuleConfigScreen} />
    </Stack.Navigator>
  );
}

// Tab Icon Component with gradient background when active
function TabIcon({
  emoji,
  size,
  focused,
  color,
}: {
  emoji: string;
  size: number;
  focused: boolean;
  color: string;
}): React.JSX.Element {
  if (focused) {
    return (
      <View style={styles.tabIconContainer}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.tabIconGradient}>
          <Text style={{fontSize: size - 4}}>{emoji}</Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={styles.tabIconContainer}>
      <View style={styles.tabIconInactive}>
        <Text style={{fontSize: size - 4}}>{emoji}</Text>
      </View>
    </View>
  );
}

// Main Tab Navigator (after login)
function MainTabs(): React.JSX.Element {
  const {role} = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
          ...Shadows.medium,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      {/* Dashboard - Always visible */}
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({size, focused, color}) => (
            <TabIcon emoji="🏠" size={size} focused={focused} color={color} />
          ),
        }}
      />

      {/* Attendance - Teachers, Directors, Admins */}
      {role && hasModuleAccess(role, 'attendance') && (
        <Tab.Screen
          name="AttendanceTab"
          component={AttendanceStack}
          options={{
            tabBarLabel: 'Asistencia',
            tabBarIcon: ({size, focused, color}) => (
              <TabIcon emoji="📋" size={size} focused={focused} color={color} />
            ),
          }}
        />
      )}

      {/* Students - Teachers (limited), Directors, Admins */}
      {role && hasModuleAccess(role, 'students') && (
        <Tab.Screen
          name="StudentsTab"
          component={StudentsStack}
          options={{
            tabBarLabel: 'Estudiantes',
            tabBarIcon: ({size, focused, color}) => (
              <TabIcon emoji="👥" size={size} focused={focused} color={color} />
            ),
          }}
        />
      )}

      {/* Payments - Directors and Admins only */}
      {role && hasModuleAccess(role, 'payments') && (
        <Tab.Screen
          name="PaymentsTab"
          component={PaymentsStack}
          options={{
            tabBarLabel: 'Pagos',
            tabBarIcon: ({size, focused, color}) => (
              <TabIcon emoji="💰" size={size} focused={focused} color={color} />
            ),
          }}
        />
      )}

      {/* Reports - Directors and Admins only */}
      {role && hasModuleAccess(role, 'reports') && (
        <Tab.Screen
          name="ReportsTab"
          component={ReportsStack}
          options={{
            tabBarLabel: 'Reportes',
            tabBarIcon: ({size, focused, color}) => (
              <TabIcon emoji="📊" size={size} focused={focused} color={color} />
            ),
          }}
        />
      )}

      {/* Admin - Admins only */}
      {role && hasModuleAccess(role, 'admin') && (
        <Tab.Screen
          name="AdminTab"
          component={AdminStack}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({size, focused, color}) => (
              <TabIcon emoji="⚙️" size={size} focused={focused} color={color} />
            ),
          }}
        />
      )}

      {/* Profile - Always visible */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({size, focused, color}) => (
            <TabIcon emoji="👤" size={size} focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Loading screen
function LoadingScreen(): React.JSX.Element {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={styles.loadingText}>Cargando...</Text>
    </View>
  );
}

// Main App Navigator
export default function AppNavigator(): React.JSX.Element {
  const {loading, isAuthenticated} = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconInactive: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
