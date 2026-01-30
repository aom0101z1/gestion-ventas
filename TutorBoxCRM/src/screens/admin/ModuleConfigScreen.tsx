// ModuleConfigScreen - Enable/disable modules per user
// Admin only

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import database from '@react-native-firebase/database';
import {useAuth} from '../../context/AuthContext';
import {DB_PATHS} from '../../config/firebase.config';
import {MODULE_ACCESS, UserRole} from '../../config/permissions.config';

interface Props {
  navigation: any;
}

interface UserData {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  enabledModules?: string[];
}

interface ModuleOverride {
  [moduleId: string]: boolean;
}

const MODULES = [
  {id: 'attendance', name: 'Asistencia', icon: '📋', description: 'Tomar y ver asistencia'},
  {id: 'students', name: 'Estudiantes', icon: '👥', description: 'Ver lista de estudiantes'},
  {id: 'payments', name: 'Pagos', icon: '💰', description: 'Registrar y ver pagos'},
  {id: 'reports', name: 'Reportes', icon: '📊', description: 'Ver reportes y estadisticas'},
  {id: 'admin', name: 'Administracion', icon: '⚙️', description: 'Configuracion del sistema'},
];

export default function ModuleConfigScreen({
  navigation,
}: Props): React.JSX.Element {
  const {isConnected, role} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [overrides, setOverrides] = useState<{[uid: string]: ModuleOverride}>({});
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (role !== 'admin') {
        Alert.alert('Acceso Denegado', 'Solo administradores pueden acceder.');
        navigation.goBack();
        return;
      }
      loadData();
    }, [role]),
  );

  const loadData = async () => {
    setLoading(true);

    try {
      // Load users
      const usersSnapshot = await database()
        .ref(DB_PATHS.USERS)
        .once('value');

      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const usersList: UserData[] = Object.entries(usersData)
          .map(([uid, data]: [string, any]) => ({
            uid,
            name: data.profile?.name || 'Sin nombre',
            email: data.profile?.email || 'Sin email',
            role: data.profile?.role || 'teacher',
            enabledModules: data.profile?.enabledModules,
          }))
          .filter(u => u.role !== 'admin'); // Don't show admins (they have all access)
        setUsers(usersList);
      }

      // Load module overrides
      const overridesSnapshot = await database()
        .ref('userModuleOverrides')
        .once('value');

      if (overridesSnapshot.exists()) {
        setOverrides(overridesSnapshot.val());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getDefaultModuleAccess = (userRole: UserRole, moduleId: string): boolean => {
    const moduleConfig = MODULE_ACCESS[moduleId as keyof typeof MODULE_ACCESS];
    if (!moduleConfig) return false;
    return moduleConfig.roles.includes(userRole);
  };

  const getModuleAccess = (user: UserData, moduleId: string): boolean => {
    // Check if there's an override
    const userOverrides = overrides[user.uid];
    if (userOverrides && userOverrides[moduleId] !== undefined) {
      return userOverrides[moduleId];
    }
    // Otherwise use default based on role
    return getDefaultModuleAccess(user.role, moduleId);
  };

  const handleToggleModule = async (user: UserData, moduleId: string) => {
    const currentValue = getModuleAccess(user, moduleId);
    const newValue = !currentValue;

    setSaving(true);

    try {
      await database()
        .ref(`userModuleOverrides/${user.uid}/${moduleId}`)
        .set(newValue);

      // Update local state
      setOverrides(prev => ({
        ...prev,
        [user.uid]: {
          ...(prev[user.uid] || {}),
          [moduleId]: newValue,
        },
      }));
    } catch (error) {
      console.error('Error saving override:', error);
      Alert.alert('Error', 'No se pudo guardar el cambio');
    }

    setSaving(false);
  };

  const handleResetToDefaults = async (user: UserData) => {
    Alert.alert(
      'Restablecer Permisos',
      `Restablecer permisos de ${user.name} a los valores por defecto de su rol?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await database()
                .ref(`userModuleOverrides/${user.uid}`)
                .remove();

              setOverrides(prev => {
                const newOverrides = {...prev};
                delete newOverrides[user.uid];
                return newOverrides;
              });

              Alert.alert('Exito', 'Permisos restablecidos');
            } catch (error) {
              console.error('Error resetting:', error);
              Alert.alert('Error', 'No se pudieron restablecer los permisos');
            }
            setSaving(false);
          },
        },
      ],
    );
  };

  const getRoleBadgeStyle = (userRole: string) => {
    switch (userRole) {
      case 'director':
        return {bg: '#dbeafe', text: '#2563eb'};
      case 'teacher':
        return {bg: '#dcfce7', text: '#16a34a'};
      default:
        return {bg: '#f3f4f6', text: '#6b7280'};
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (selectedUser) {
              setSelectedUser(null);
            } else {
              navigation.goBack();
            }
          }}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedUser ? selectedUser.name : 'Configuracion de Modulos'}
        </Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {selectedUser ? (
        // Module configuration for selected user
        <ScrollView style={styles.content}>
          <View style={styles.userSummary}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {selectedUser.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{selectedUser.name}</Text>
              <Text style={styles.userEmail}>{selectedUser.email}</Text>
              <View
                style={[
                  styles.roleBadge,
                  {backgroundColor: getRoleBadgeStyle(selectedUser.role).bg},
                ]}>
                <Text
                  style={[
                    styles.roleBadgeText,
                    {color: getRoleBadgeStyle(selectedUser.role).text},
                  ]}>
                  {selectedUser.role}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.modulesSection}>
            <Text style={styles.sectionTitle}>Modulos</Text>
            <Text style={styles.sectionSubtitle}>
              Habilita o deshabilita modulos para este usuario
            </Text>

            {MODULES.map(module => {
              const hasAccess = getModuleAccess(selectedUser, module.id);
              const isDefault = getDefaultModuleAccess(selectedUser.role, module.id);
              const hasOverride = overrides[selectedUser.uid]?.[module.id] !== undefined;

              return (
                <View key={module.id} style={styles.moduleCard}>
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleIcon}>{module.icon}</Text>
                    <View style={styles.moduleDetails}>
                      <Text style={styles.moduleName}>{module.name}</Text>
                      <Text style={styles.moduleDescription}>
                        {module.description}
                      </Text>
                      {hasOverride && (
                        <Text style={styles.overrideIndicator}>
                          (Personalizado)
                        </Text>
                      )}
                    </View>
                  </View>
                  <Switch
                    value={hasAccess}
                    onValueChange={() => handleToggleModule(selectedUser, module.id)}
                    trackColor={{false: '#e5e7eb', true: '#a5b4fc'}}
                    thumbColor={hasAccess ? '#667eea' : '#9ca3af'}
                    disabled={saving}
                  />
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => handleResetToDefaults(selectedUser)}
            disabled={saving}>
            <Text style={styles.resetButtonText}>
              Restablecer a Valores por Defecto
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : (
        // User list
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          <Text style={styles.sectionSubtitle}>
            Selecciona un usuario para configurar sus modulos
          </Text>

          {users.map(user => {
            const badgeStyle = getRoleBadgeStyle(user.role);
            const hasOverrides = overrides[user.uid] !== undefined;

            return (
              <TouchableOpacity
                key={user.uid}
                style={styles.userCard}
                onPress={() => setSelectedUser(user)}>
                <View style={styles.userCardAvatar}>
                  <Text style={styles.userCardAvatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userCardInfo}>
                  <Text style={styles.userCardName}>{user.name}</Text>
                  <Text style={styles.userCardEmail}>{user.email}</Text>
                </View>
                <View style={styles.userCardMeta}>
                  <View
                    style={[
                      styles.roleBadge,
                      {backgroundColor: badgeStyle.bg},
                    ]}>
                    <Text style={[styles.roleBadgeText, {color: badgeStyle.text}]}>
                      {user.role}
                    </Text>
                  </View>
                  {hasOverrides && (
                    <Text style={styles.customizedText}>Personalizado</Text>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}

          {users.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>Sin usuarios</Text>
              <Text style={styles.emptyText}>
                No hay usuarios para configurar
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#667eea',
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  offlineBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userCardAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  userCardEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  userCardMeta: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  customizedText: {
    fontSize: 10,
    color: '#f59e0b',
    marginTop: 4,
  },
  chevron: {
    fontSize: 24,
    color: '#9ca3af',
  },
  // Selected user styles
  userSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modulesSection: {
    marginBottom: 20,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  moduleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  moduleDetails: {
    flex: 1,
  },
  moduleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  moduleDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  overrideIndicator: {
    fontSize: 11,
    color: '#f59e0b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  resetButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});
