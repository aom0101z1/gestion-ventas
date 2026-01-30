// PaymentsHomeScreen - Beautiful modern payments module
// Director/Admin only

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
import {PaymentService} from '../../services/PaymentService';
import {StudentService} from '../../services/StudentService';
import {Payment} from '../../types';
import {Colors, Shadows, BorderRadius, Spacing} from '../../theme';

interface Props {
  navigation: any;
}

export default function PaymentsHomeScreen({navigation}: Props): React.JSX.Element {
  const {isConnected} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayTotal: 0,
    todayCount: 0,
    monthTotal: 0,
    monthCount: 0,
    pendingCount: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [studentMap, setStudentMap] = useState<Map<string, string>>(new Map());

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    await PaymentService.initialize();
    await StudentService.initialize();

    // Get stats
    const paymentStats = PaymentService.getPaymentStats();
    setStats(paymentStats);

    // Get recent payments
    const recent = PaymentService.getRecentPayments(10);
    setRecentPayments(recent);

    // Build student name map
    const students = StudentService.getAllStudents();
    const nameMap = new Map<string, string>();
    students.forEach(s => nameMap.set(s.id, s.nombre));
    setStudentMap(nameMap);

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await PaymentService.refresh();
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return '$' + amount.toLocaleString('es-CO');
  };

  const handleRecordPayment = () => {
    navigation.navigate('RecordPayment');
  };

  const handleViewHistory = () => {
    navigation.navigate('PaymentHistory');
  };

  const handleViewPending = () => {
    navigation.navigate('PendingPayments');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#dd6b20" />

      {/* Gradient Header */}
      <LinearGradient
        colors={['#ed8936', '#dd6b20']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>💰</Text>
              <View>
                <Text style={styles.headerTitle}>Pagos</Text>
                <Text style={styles.headerSubtitle}>
                  {stats.monthCount} pagos este mes
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
            colors={['#ed8936']}
            tintColor="#ed8936"
          />
        }>
        {loading ? (
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['#ed8936', '#dd6b20']}
              style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color={Colors.white} />
            </LinearGradient>
            <Text style={styles.loadingText}>Cargando pagos...</Text>
          </View>
        ) : (
          <>
            {/* Month Total Card */}
            <View style={styles.monthCard}>
              <LinearGradient
                colors={['#ed8936', '#dd6b20']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.monthGradient}>
                <View style={styles.monthDecor1} />
                <View style={styles.monthDecor2} />
                <Text style={styles.monthLabel}>Total del Mes</Text>
                <Text style={styles.monthValue}>
                  {formatCurrency(stats.monthTotal)}
                </Text>
                <Text style={styles.monthCount}>{stats.monthCount} pagos registrados</Text>
              </LinearGradient>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#48bb78', '#38a169']}
                  style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>💵</Text>
                </LinearGradient>
                <Text style={styles.statValue}>
                  {formatCurrency(stats.todayTotal)}
                </Text>
                <Text style={styles.statLabel}>Cobrado Hoy</Text>
                <Text style={styles.statCount}>{stats.todayCount} pagos</Text>
              </View>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={stats.pendingCount > 0 ? ['#fbbf24', '#f59e0b'] : ['#9ca3af', '#6b7280']}
                  style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>⚠️</Text>
                </LinearGradient>
                <Text style={[styles.statValue, stats.pendingCount > 0 && styles.pendingValue]}>
                  {stats.pendingCount}
                </Text>
                <Text style={styles.statLabel}>Pendientes</Text>
                <Text style={styles.statCount}>este mes</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleRecordPayment}
                activeOpacity={0.7}>
                <LinearGradient
                  colors={['#48bb78', '#38a169']}
                  style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>➕</Text>
                </LinearGradient>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Registrar Pago</Text>
                  <Text style={styles.actionSubtitle}>
                    Nuevo pago de estudiante
                  </Text>
                </View>
                <View style={styles.actionArrowContainer}>
                  <Text style={styles.actionArrow}>›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleViewHistory}
                activeOpacity={0.7}>
                <LinearGradient
                  colors={['#4299e1', '#3182ce']}
                  style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>📋</Text>
                </LinearGradient>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Ver Historial</Text>
                  <Text style={styles.actionSubtitle}>Pagos registrados</Text>
                </View>
                <View style={styles.actionArrowContainer}>
                  <Text style={styles.actionArrow}>›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleViewPending}
                activeOpacity={0.7}>
                <LinearGradient
                  colors={stats.pendingCount > 0 ? ['#fbbf24', '#f59e0b'] : ['#9ca3af', '#6b7280']}
                  style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>⏳</Text>
                </LinearGradient>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Pagos Pendientes</Text>
                  <Text style={styles.actionSubtitle}>
                    {stats.pendingCount} estudiantes por cobrar
                  </Text>
                </View>
                {stats.pendingCount > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{stats.pendingCount}</Text>
                  </View>
                )}
                <View style={styles.actionArrowContainer}>
                  <Text style={styles.actionArrow}>›</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Recent Payments */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pagos Recientes</Text>
                <TouchableOpacity onPress={handleViewHistory}>
                  <Text style={styles.seeAllText}>Ver todos →</Text>
                </TouchableOpacity>
              </View>

              {recentPayments.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Text style={styles.emptyIcon}>💳</Text>
                  </View>
                  <Text style={styles.emptyTitle}>Sin pagos recientes</Text>
                  <Text style={styles.emptySubtext}>
                    Los pagos registrados aparecerán aquí
                  </Text>
                </View>
              ) : (
                <View style={styles.paymentsList}>
                  {recentPayments.map((payment, index) => (
                    <View
                      key={payment.id}
                      style={[
                        styles.paymentCard,
                        index === recentPayments.length - 1 && styles.paymentCardLast,
                      ]}>
                      <LinearGradient
                        colors={
                          index % 3 === 0
                            ? ['#667eea', '#764ba2']
                            : index % 3 === 1
                              ? ['#48bb78', '#38a169']
                              : ['#4299e1', '#3182ce']
                        }
                        style={styles.paymentAvatar}>
                        <Text style={styles.paymentAvatarText}>
                          {(studentMap.get(payment.studentId) || 'E').charAt(0)}
                        </Text>
                      </LinearGradient>
                      <View style={styles.paymentInfo}>
                        <Text style={styles.paymentStudent} numberOfLines={1}>
                          {studentMap.get(payment.studentId) || 'Estudiante'}
                        </Text>
                        <Text style={styles.paymentMeta}>
                          {payment.method} • {new Date(payment.date).toLocaleDateString('es-CO')}
                        </Text>
                      </View>
                      <View style={styles.paymentAmountContainer}>
                        <Text style={styles.paymentAmount}>
                          {formatCurrency(payment.amount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Bottom spacing */}
            <View style={styles.bottomSpacer} />
          </>
        )}
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
  monthCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.large,
  },
  monthGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  monthDecor1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  monthDecor2: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  monthLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  monthValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
    marginVertical: 6,
  },
  monthCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.medium,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statIcon: {
    fontSize: 22,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  pendingValue: {
    color: '#f59e0b',
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statCount: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '600',
    marginBottom: Spacing.md,
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
  pendingBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: Spacing.sm,
  },
  pendingBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
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
  paymentsList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  paymentCardLast: {
    borderBottomWidth: 0,
  },
  paymentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  paymentAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentStudent: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  paymentMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paymentAmountContainer: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
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
  bottomSpacer: {
    height: Spacing.xl,
  },
});
