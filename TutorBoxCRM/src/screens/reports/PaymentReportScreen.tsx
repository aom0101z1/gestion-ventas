// PaymentReportScreen - Payment collection report
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
import {PaymentService} from '../../services/PaymentService';
import {StudentService} from '../../services/StudentService';
import {Payment} from '../../types';

interface Props {
  navigation: any;
}

interface MonthlyData {
  month: string;
  year: number;
  total: number;
  count: number;
  methods: {[method: string]: number};
}

export default function PaymentReportScreen({
  navigation,
}: Props): React.JSX.Element {
  const {isConnected} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentMap, setStudentMap] = useState<Map<string, string>>(new Map());

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    await PaymentService.initialize();
    await StudentService.initialize();

    setPayments(PaymentService.getAllPayments());

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

  // Get monthly breakdown
  const getMonthlyData = (): MonthlyData[] => {
    const monthMap: {[key: string]: MonthlyData} = {};

    payments.forEach(payment => {
      const date = new Date(payment.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('es-ES', {month: 'long'});

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthName,
          year: date.getFullYear(),
          total: 0,
          count: 0,
          methods: {},
        };
      }

      monthMap[monthKey].total += payment.amount;
      monthMap[monthKey].count++;

      if (!monthMap[monthKey].methods[payment.method]) {
        monthMap[monthKey].methods[payment.method] = 0;
      }
      monthMap[monthKey].methods[payment.method] += payment.amount;
    });

    return Object.entries(monthMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([_, data]) => data);
  };

  // Get payment method breakdown
  const getMethodBreakdown = () => {
    const methodMap: {[method: string]: {count: number; total: number}} = {};

    payments.forEach(payment => {
      if (!methodMap[payment.method]) {
        methodMap[payment.method] = {count: 0, total: 0};
      }
      methodMap[payment.method].count++;
      methodMap[payment.method].total += payment.amount;
    });

    return Object.entries(methodMap)
      .map(([method, data]) => ({method, ...data}))
      .sort((a, b) => b.total - a.total);
  };

  // Get top payers (most payments)
  const getTopPayers = () => {
    const payerMap: {[studentId: string]: {count: number; total: number}} = {};

    payments.forEach(payment => {
      if (!payerMap[payment.studentId]) {
        payerMap[payment.studentId] = {count: 0, total: 0};
      }
      payerMap[payment.studentId].count++;
      payerMap[payment.studentId].total += payment.amount;
    });

    return Object.entries(payerMap)
      .map(([studentId, data]) => ({
        studentId,
        name: studentMap.get(studentId) || 'Estudiante',
        ...data,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const monthlyData = getMonthlyData();
  const methodBreakdown = getMethodBreakdown();
  const topPayers = getTopPayers();

  // Overall stats
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPayments = payments.length;
  const avgPayment = totalPayments > 0 ? totalCollected / totalPayments : 0;

  // Current month stats
  const now = new Date();
  const currentMonthPayments = payments.filter(p => {
    const date = new Date(p.date);
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });
  const currentMonthTotal = currentMonthPayments.reduce(
    (sum, p) => sum + p.amount,
    0,
  );

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'efectivo':
        return '💵';
      case 'transferencia':
        return '🏦';
      case 'nequi':
        return '📱';
      case 'daviplata':
        return '📲';
      default:
        return '💳';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando reporte...</Text>
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
        <Text style={styles.headerTitle}>Reporte de Pagos</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryMainValue}>
            {formatCurrency(currentMonthTotal)}
          </Text>
          <Text style={styles.summaryMainLabel}>Recaudado Este Mes</Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>
              {formatCurrency(totalCollected)}
            </Text>
            <Text style={styles.summaryStatLabel}>Total Historico</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{totalPayments}</Text>
            <Text style={styles.summaryStatLabel}>Total Pagos</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>
              {formatCurrency(avgPayment)}
            </Text>
            <Text style={styles.summaryStatLabel}>Pago Promedio</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Method Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por Metodo de Pago</Text>
          <View style={styles.card}>
            {methodBreakdown.map(item => (
              <View key={item.method} style={styles.methodRow}>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodIcon}>
                    {getMethodIcon(item.method)}
                  </Text>
                  <View>
                    <Text style={styles.methodName}>{item.method}</Text>
                    <Text style={styles.methodCount}>{item.count} pagos</Text>
                  </View>
                </View>
                <Text style={styles.methodTotal}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            ))}
            {methodBreakdown.length === 0 && (
              <Text style={styles.noDataText}>Sin datos</Text>
            )}
          </View>
        </View>

        {/* Monthly Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por Mes</Text>
          {monthlyData.map((month, index) => (
            <View key={index} style={styles.monthCard}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthName}>
                  {month.month} {month.year}
                </Text>
                <Text style={styles.monthTotal}>
                  {formatCurrency(month.total)}
                </Text>
              </View>
              <View style={styles.monthDetails}>
                <Text style={styles.monthCount}>{month.count} pagos</Text>
                <View style={styles.monthMethods}>
                  {Object.entries(month.methods).map(([method, amount]) => (
                    <Text key={method} style={styles.monthMethod}>
                      {getMethodIcon(method)} {formatCurrency(amount)}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          ))}
          {monthlyData.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.noDataText}>Sin datos de pagos</Text>
            </View>
          )}
        </View>

        {/* Top Payers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mayores Aportes</Text>
          <View style={styles.card}>
            {topPayers.map((payer, index) => (
              <View key={payer.studentId} style={styles.payerRow}>
                <View style={styles.payerRank}>
                  <Text style={styles.payerRankText}>{index + 1}</Text>
                </View>
                <View style={styles.payerInfo}>
                  <Text style={styles.payerName}>{payer.name}</Text>
                  <Text style={styles.payerCount}>{payer.count} pagos</Text>
                </View>
                <Text style={styles.payerTotal}>
                  {formatCurrency(payer.total)}
                </Text>
              </View>
            ))}
            {topPayers.length === 0 && (
              <Text style={styles.noDataText}>Sin datos</Text>
            )}
          </View>
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
  summaryContainer: {
    backgroundColor: '#059669',
    padding: 20,
  },
  summaryMain: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryMainValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryMainLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  methodInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    fontSize: 24,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  methodCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  methodTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  monthCard: {
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  monthTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  monthDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  monthMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  monthMethod: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  payerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payerRankText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  payerInfo: {
    flex: 1,
  },
  payerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  payerCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  payerTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 16,
  },
  bottomPadding: {
    height: 40,
  },
});
