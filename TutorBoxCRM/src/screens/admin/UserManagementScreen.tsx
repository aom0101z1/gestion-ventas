// UserManagementScreen - View and manage users
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
  TextInput,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import database from '@react-native-firebase/database';
import {useAuth} from '../../context/AuthContext';
import {DB_PATHS} from '../../config/firebase.config';
import {UserRole} from '../../config/permissions.config';

interface Props {
  navigation: any;
}

interface UserData {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  lastLogin?: string;
  createdAt?: string;
  mobileAccess?: boolean;
  teacherId?: string;
}

export default function UserManagementScreen({
  navigation,
}: Props): React.JSX.Element {
  const {isConnected, role} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

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
      const usersSnapshot = await database()
        .ref(DB_PATHS.USERS)
        .once('value');

      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const usersList: UserData[] = Object.entries(usersData).map(
          ([uid, data]: [string, any]) => ({
            uid,
            name: data.profile?.name || 'Sin nombre',
            email: data.profile?.email || 'Sin email',
            role: data.profile?.role || 'unknown',
            lastLogin: data.profile?.lastLogin,
            createdAt: data.profile?.createdAt,
            mobileAccess: data.profile?.mobileAccess,
            teacherId: data.profile?.teacherId,
          }),
        );
        setUsers(usersList);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleMobileAccess = async (user: UserData) => {
    const newValue = !user.mobileAccess;

    Alert.alert(
      'Confirmar',
      `${newValue ? 'Habilitar' : 'Deshabilitar'} acceso movil para ${user.name}?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await database()
                .ref(`${DB_PATHS.USERS}/${user.uid}/profile/mobileAccess`)
                .set(newValue);

              // Update local state
              setUsers(prev =>
                prev.map(u =>
                  u.uid === user.uid ? {...u, mobileAccess: newValue} : u,
                ),
              );

              Alert.alert(
                'Exito',
                `Acceso movil ${newValue ? 'habilitado' : 'deshabilitado'}`,
              );
            } catch (error) {
              console.error('Error updating mobile access:', error);
              Alert.alert('Error', 'No se pudo actualizar el acceso');
            }
          },
        },
      ],
    );
  };

  const handleChangeRole = async (user: UserData, newRole: UserRole) => {
    if (newRole === user.role) return;

    Alert.alert(
      'Cambiar Rol',
      `Cambiar rol de ${user.name} a ${newRole}?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await database()
                .ref(`${DB_PATHS.USERS}/${user.uid}/profile/role`)
                .set(newRole);

              setUsers(prev =>
                prev.map(u =>
                  u.uid === user.uid ? {...u, role: newRole} : u,
                ),
              );

              Alert.alert('Exito', `Rol cambiado a ${newRole}`);
            } catch (error) {
              console.error('Error changing role:', error);
              Alert.alert('Error', 'No se pudo cambiar el rol');
            }
          },
        },
      ],
    );
  };

  const getFilteredUsers = () => {
    let filtered = [...users];

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        u =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query),
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const getRoleBadgeStyle = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return {bg: '#fee2e2', text: '#dc2626'};
      case 'director':
        return {bg: '#dbeafe', text: '#2563eb'};
      case 'teacher':
        return {bg: '#dcfce7', text: '#16a34a'};
      default:
        return {bg: '#f3f4f6', text: '#6b7280'};
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
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
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestion de Usuarios</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Role Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            {id: 'all', label: 'Todos'},
            {id: 'admin', label: 'Admin'},
            {id: 'director', label: 'Director'},
            {id: 'teacher', label: 'Profesor'},
          ].map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                filterRole === filter.id && styles.filterButtonActive,
              ]}
              onPress={() => setFilterRole(filter.id)}>
              <Text
                style={[
                  styles.filterButtonText,
                  filterRole === filter.id && styles.filterButtonTextActive,
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Users List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredUsers.map(user => {
          const badgeStyle = getRoleBadgeStyle(user.role);
          return (
            <View key={user.uid} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View
                  style={[styles.roleBadge, {backgroundColor: badgeStyle.bg}]}>
                  <Text style={[styles.roleBadgeText, {color: badgeStyle.text}]}>
                    {user.role}
                  </Text>
                </View>
              </View>

              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ultimo acceso:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(user.lastLogin)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registrado:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(user.createdAt)}
                  </Text>
                </View>
                {user.teacherId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID Profesor:</Text>
                    <Text style={styles.detailValue}>{user.teacherId}</Text>
                  </View>
                )}
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[
                    styles.accessButton,
                    user.mobileAccess
                      ? styles.accessButtonActive
                      : styles.accessButtonInactive,
                  ]}
                  onPress={() => handleToggleMobileAccess(user)}>
                  <Text
                    style={[
                      styles.accessButtonText,
                      user.mobileAccess
                        ? styles.accessButtonTextActive
                        : styles.accessButtonTextInactive,
                    ]}>
                    {user.mobileAccess ? '📱 Acceso Movil' : '🚫 Sin Acceso'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.roleButtons}>
                  {(['teacher', 'director', 'admin'] as UserRole[]).map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.roleButton,
                        user.role === r && styles.roleButtonActive,
                      ]}
                      onPress={() => handleChangeRole(user, r)}>
                      <Text
                        style={[
                          styles.roleButtonText,
                          user.role === r && styles.roleButtonTextActive,
                        ]}>
                        {r === 'teacher'
                          ? 'Prof'
                          : r === 'director'
                          ? 'Dir'
                          : 'Admin'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          );
        })}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyTitle}>Sin usuarios</Text>
            <Text style={styles.emptyText}>
              No se encontraron usuarios con estos filtros
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  statsBar: {
    padding: 12,
    backgroundColor: '#f3f4f6',
  },
  statsText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
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
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    color: '#1f2937',
  },
  userActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accessButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  accessButtonActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  accessButtonInactive: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  accessButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accessButtonTextActive: {
    color: '#16a34a',
  },
  accessButtonTextInactive: {
    color: '#dc2626',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  roleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  roleButtonActive: {
    backgroundColor: '#667eea',
  },
  roleButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  roleButtonTextActive: {
    color: '#ffffff',
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
