// ReportsHomeScreen - Reports dashboard
// Directors and Admins only

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
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {AttendanceService} from '../../services/AttendanceService';
import {PaymentService} from '../../services/PaymentService';
import {StudentService} from '../../services/StudentService';
import {GroupService} from '../../services/GroupService';

interface Props {
  navigation: any;
}

interface ReportStats {
  // Attendance
  todayClasses: number;
  weekClasses: number;
  monthClasses: number;
  avgAttendanceRate: number;
  // Payments
  monthPayments: number;
  monthTotal: number;
  pendingStudents: number;
  collectionRate: number;
  // General
  activeStudents: number;
  activeGroups: number;
}

export default function ReportsHomeScreen({
  navigation,
}: Props): React.JSX.Element {
  const {isConnected} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ReportStats>({
    todayClasses: 0,
    weekClasses: 0,
    monthClasses: 0,
    avgAttendanceRate: 0,
    monthPayments: 0,
    monthTotal: 0,
    pendingStudents: 0,
    collectionRate: 0,
    activeStudents: 0,
    activeGroups: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);

    await Promise.all([
      AttendanceService.initialize(),
      PaymentService.initialize(),
      StudentService.initialize(),
      GroupService.initialize(),
    ]);

    // Calculate stats
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Attendance stats
    const allRecords = await AttendanceService.fetchAllRecords();
    const todayRecords = allRecords.filter((r: any) => r.date === today);
    const weekRecords = allRecords.filter((r: any) => new Date(r.date) >= weekAgo);
    const monthRecords = allRecords.filter((r: any) => new Date(r.date) >= monthStart);

    // Calculate average attendance rate
    let totalPresent = 0;
    let totalStudents = 0;
    monthRecords.forEach((record: any) => {
      totalPresent += record.studentsPresent + record.studentsLate;
      totalStudents +=
        record.studentsPresent + record.studentsLate + record.studentsAbsent;
    });
    const avgAttendanceRate =
      totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;

    // Payment stats
    const paymentStats = PaymentService.getPaymentStats();
    const allStudents = StudentService.getAllStudents();
    const activeStudents = allStudents.filter(s => s.status === 'active');
    const collectionRate =
      activeStudents.length > 0
        ? ((activeStudents.length - paymentStats.pendingCount) /
            activeStudents.length) *
          100
        : 0;

    // Group stats
    const allGroups = GroupService.getAllGroups();
    const activeGroups = allGroups.filter(g => g.status === 'active');

    setStats({
      todayClasses: todayRecords.length,
      weekClasses: weekRecords.length,
      monthClasses: monthRecords.length,
      avgAttendanceRate,
      monthPayments: paymentStats.monthCount,
      monthTotal: paymentStats.monthTotal,
      pendingStudents: paymentStats.pendingCount,
      collectionRate,
      activeStudents: activeStudents.length,
      activeGroups: activeGroups.length,
    });

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return '$' + amount.toLocaleString('es-CO');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando reportes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Reportes</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>{stats.activeStudents}</Text>
            <Text style={styles.quickStatLabel}>Estudiantes</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>{stats.activeGroups}</Text>
            <Text style={styles.quickStatLabel}>Grupos</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>{stats.monthClasses}</Text>
            <Text style={styles.quickStatLabel}>Clases/Mes</Text>
          </View>
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Asistencia</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AttendanceReport')}>
              <Text style={styles.seeAllText}>Ver reporte</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statItemValue}>{stats.todayClasses}</Text>
                <Text style={styles.statItemLabel}>Hoy</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statItemValue}>{stats.weekClasses}</Text>
                <Text style={styles.statItemLabel}>Esta Semana</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statItemValue}>{stats.monthClasses}</Text>
                <Text style={styles.statItemLabel}>Este Mes</Text>
              </View>
            </View>

            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>Tasa de Asistencia Promedio</Text>
              <View style={styles.rateBarContainer}>
                <View
                  style={[
                    styles.rateBar,
                    {width: `${Math.min(stats.avgAttendanceRate, 100)}%`},
                  ]}
                />
              </View>
              <Text style={styles.rateValue}>
                {stats.avgAttendanceRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Payments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💰 Pagos</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PaymentReport')}>
              <Text style={styles.seeAllText}>Ver reporte</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.paymentSummary}>
              <View style={styles.paymentMainStat}>
                <Text style={styles.paymentMainValue}>
                  {formatCurrency(stats.monthTotal)}
                </Text>
                <Text style={styles.paymentMainLabel}>Recaudado este mes</Text>
              </View>
              <View style={styles.paymentSubStats}>
                <View style={styles.paymentSubStat}>
                  <Text style={styles.paymentSubValue}>
                    {stats.monthPayments}
                  </Text>
                  <Text style={styles.paymentSubLabel}>Pagos</Text>
                </View>
                <View style={styles.paymentSubStat}>
                  <Text
                    style={[styles.paymentSubValue, styles.pendingValue]}>
                    {stats.pendingStudents}
                  </Text>
                  <Text style={styles.paymentSubLabel}>Pendientes</Text>
                </View>
              </View>
            </View>

            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>Tasa de Recaudo</Text>
              <View style={styles.rateBarContainer}>
                <View
                  style={[
                    styles.rateBar,
                    styles.rateBarGreen,
                    {width: `${Math.min(stats.collectionRate, 100)}%`},
                  ]}
                />
              </View>
              <Text style={[styles.rateValue, styles.rateValueGreen]}>
                {stats.collectionRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Report Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reportes Disponibles</Text>

          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => navigation.navigate('AttendanceReport')}>
            <Text style={styles.reportIcon}>📋</Text>
            <View style={styles.reportInfo}>
              <Text style={styles.reportTitle}>Reporte de Asistencia</Text>
              <Text style={styles.reportSubtitle}>
                Por fecha, grupo o profesor
              </Text>
            </View>
            <Text style={styles.reportChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => navigation.navigate('PaymentReport')}>
            <Text style={styles.reportIcon}>💵</Text>
            <View style={styles.reportInfo}>
              <Text style={styles.reportTitle}>Reporte de Pagos</Text>
              <Text style={styles.reportSubtitle}>
                Recaudo mensual y pendientes
              </Text>
            </View>
            <Text style={styles.reportChevron}>›</Text>
          </TouchableOpacity>
        </View>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  offlineBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  statItemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statItemLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  rateContainer: {
    marginTop: 8,
  },
  rateLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  rateBarContainer: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
  },
  rateBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 5,
  },
  rateBarGreen: {
    backgroundColor: '#10b981',
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginTop: 8,
    textAlign: 'right',
  },
  rateValueGreen: {
    color: '#10b981',
  },
  paymentSummary: {
    marginBottom: 16,
  },
  paymentMainStat: {
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMainValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
  },
  paymentMainLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  paymentSubStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  paymentSubStat: {
    alignItems: 'center',
  },
  paymentSubValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  pendingValue: {
    color: '#f59e0b',
  },
  paymentSubLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  reportIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  reportSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  reportChevron: {
    fontSize: 24,
    color: '#9ca3af',
  },
  bottomPadding: {
    height: 40,
  },
});
