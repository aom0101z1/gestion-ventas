// AttendanceHomeScreen - Beautiful modern attendance module
// Shows today's classes and attendance options

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {GroupService} from '../../services/GroupService';
import {OfflineSyncService} from '../../services/OfflineSyncService';
import {GPSService} from '../../services/GPSService';
import {Group} from '../../types';
import {Colors, Shadows, BorderRadius, Spacing} from '../../theme';

interface Props {
  navigation: any;
}

export default function AttendanceHomeScreen({navigation}: Props): React.JSX.Element {
  const {role, isConnected} = useAuth();
  const [todaysGroups, setTodaysGroups] = useState<Group[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);

    // Initialize services if needed
    await GroupService.initialize();

    // Get today's groups
    const groups = GroupService.getTodaysGroups();
    setTodaysGroups(groups);

    // Get pending sync count
    const pending = OfflineSyncService.getPendingCount();
    setPendingCount(pending);

    // Check GPS availability
    checkGPS();

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await GroupService.refresh();
    await loadData();
    setRefreshing(false);
  };

  const checkGPS = async () => {
    setGpsStatus('checking');
    try {
      const hasPermission = await GPSService.requestPermission();
      if (hasPermission) {
        setGpsStatus('available');
      } else {
        setGpsStatus('unavailable');
      }
    } catch {
      setGpsStatus('unavailable');
    }
  };

  const handleTakeAttendance = () => {
    navigation.navigate('SelectGroup');
  };

  const handleSelectGroup = (group: Group) => {
    navigation.navigate('TakeAttendance', {groupId: group.groupId});
  };

  const getGpsGradient = (): [string, string] => {
    if (gpsStatus === 'available') return ['#48bb78', '#38a169'];
    if (gpsStatus === 'unavailable') return ['#fc8181', '#f56565'];
    return ['#4299e1', '#3182ce'];
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#f56565" />

      {/* Gradient Header */}
      <LinearGradient
        colors={['#fc8181', '#f56565']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>📋</Text>
              <View>
                <Text style={styles.headerTitle}>Asistencia</Text>
                <Text style={styles.headerSubtitle}>
                  {todaysGroups.length} clase{todaysGroups.length !== 1 ? 's' : ''} hoy
                </Text>
              </View>
            </View>
            {!isConnected && (
              <View style={styles.offlineBadge}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineBadgeText}>Offline</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f56565']}
            tintColor="#f56565"
          />
        }>
        {/* GPS Status Card */}
        <View style={styles.gpsCard}>
          <LinearGradient
            colors={getGpsGradient()}
            style={styles.gpsIconContainer}>
            <Text style={styles.gpsIcon}>
              {gpsStatus === 'checking' ? '📡' : gpsStatus === 'available' ? '✅' : '❌'}
            </Text>
          </LinearGradient>
          <View style={styles.gpsInfo}>
            <Text style={styles.gpsTitle}>
              {gpsStatus === 'checking'
                ? 'Verificando GPS...'
                : gpsStatus === 'available'
                ? 'GPS Disponible'
                : 'GPS No Disponible'}
            </Text>
            <Text style={styles.gpsSubtitle}>
              Debes estar dentro de 500m del lugar de clase
            </Text>
          </View>
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={checkGPS}
            activeOpacity={0.8}>
            <LinearGradient
              colors={getGpsGradient()}
              style={styles.gpsButtonGradient}>
              {gpsStatus === 'checking' ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.gpsButtonText}>Verificar</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Today's Classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis Clases de Hoy</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <LinearGradient
                colors={['#fc8181', '#f56565']}
                style={styles.loadingIconContainer}>
                <ActivityIndicator size="large" color={Colors.white} />
              </LinearGradient>
              <Text style={styles.loadingText}>Cargando clases...</Text>
            </View>
          ) : todaysGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>📅</Text>
              </View>
              <Text style={styles.emptyTitle}>Sin clases programadas</Text>
              <Text style={styles.emptySubtext}>
                Las clases aparecerán aquí según tu horario
              </Text>
            </View>
          ) : (
            todaysGroups.map((group, index) => (
              <TouchableOpacity
                key={group.groupId}
                style={styles.classCard}
                onPress={() => handleSelectGroup(group)}
                activeOpacity={0.7}>
                <LinearGradient
                  colors={
                    index % 3 === 0
                      ? ['#667eea', '#764ba2']
                      : index % 3 === 1
                        ? ['#48bb78', '#38a169']
                        : ['#4299e1', '#3182ce']
                  }
                  style={styles.classNumberContainer}>
                  <Text style={styles.classNumber}>{index + 1}</Text>
                </LinearGradient>
                <View style={styles.classInfo}>
                  <View style={styles.classHeader}>
                    <Text style={styles.className} numberOfLines={1}>
                      {group.displayName || `Grupo ${group.groupId}`}
                    </Text>
                    <LinearGradient
                      colors={['#fc8181', '#f56565']}
                      style={styles.classBadge}>
                      <Text style={styles.classBadgeText}>HOY</Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.classDetails}>
                    <View style={styles.classDetailItem}>
                      <Text style={styles.classDetailIcon}>⏰</Text>
                      <Text style={styles.classDetailText}>
                        {group.startTime} - {group.endTime}
                      </Text>
                    </View>
                    <View style={styles.classDetailItem}>
                      <Text style={styles.classDetailIcon}>👥</Text>
                      <Text style={styles.classDetailText}>
                        {group.studentIds?.length || 0} est.
                      </Text>
                    </View>
                  </View>
                  {group.room && (
                    <View style={styles.classLocation}>
                      <Text style={styles.classLocationIcon}>📍</Text>
                      <Text style={styles.classLocationText}>{group.room}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.classArrowContainer}>
                  <Text style={styles.classArrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleTakeAttendance}
            activeOpacity={0.7}>
            <LinearGradient
              colors={['#48bb78', '#38a169']}
              style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>➕</Text>
            </LinearGradient>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Tomar Asistencia</Text>
              <Text style={styles.actionSubtitle}>
                Selecciona un grupo para comenzar
              </Text>
            </View>
            <View style={styles.actionArrowContainer}>
              <Text style={styles.actionArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
            <LinearGradient
              colors={['#4299e1', '#3182ce']}
              style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📊</Text>
            </LinearGradient>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Ver Historial</Text>
              <Text style={styles.actionSubtitle}>
                Revisa registros anteriores
              </Text>
            </View>
            <View style={styles.actionArrowContainer}>
              <Text style={styles.actionArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {(role === 'admin' || role === 'director') && (
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
              <LinearGradient
                colors={['#9f7aea', '#805ad5']}
                style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📈</Text>
              </LinearGradient>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Reportes</Text>
                <Text style={styles.actionSubtitle}>
                  Estadísticas de asistencia
                </Text>
              </View>
              <View style={styles.actionArrowContainer}>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Pending Sync */}
        {pendingCount > 0 && (
          <View style={styles.pendingCard}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.pendingGradient}>
              <View style={styles.pendingIconContainer}>
                <Text style={styles.pendingIcon}>⏳</Text>
              </View>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingTitle}>Pendiente de Sincronizar</Text>
                <Text style={styles.pendingText}>
                  {pendingCount} registro{pendingCount !== 1 ? 's' : ''} esperando conexión
                </Text>
              </View>
              {isConnected && (
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={() => OfflineSyncService.processQueue()}
                  activeOpacity={0.8}>
                  <Text style={styles.syncButtonText}>Sincronizar</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 30,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
    marginRight: 6,
  },
  offlineBadgeText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  gpsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  gpsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  gpsIcon: {
    fontSize: 22,
  },
  gpsInfo: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  gpsSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  gpsButton: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  gpsButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 85,
  },
  gpsButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.medium,
  },
  loadingIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.small,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  classCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.medium,
  },
  classNumberContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  classNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  classBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  classBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  classDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  classDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classDetailIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  classDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  classLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  classLocationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  classLocationText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  classArrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  classArrow: {
    fontSize: 18,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.medium,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionArrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  actionArrow: {
    fontSize: 18,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  pendingCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  pendingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  pendingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  pendingIcon: {
    fontSize: 20,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  pendingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.sm,
  },
  syncButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});
