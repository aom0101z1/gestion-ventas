// PaymentHistoryScreen - View all payment history
// Directors and Admins only

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
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

type FilterPeriod = 'all' | 'today' | 'week' | 'month';

export default function PaymentHistoryScreen({
  navigation,
}: Props): React.JSX.Element {
  const {isConnected} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentMap, setStudentMap] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    await PaymentService.initialize();
    await StudentService.initialize();

    // Get all payments
    const allPayments = PaymentService.getAllPayments();
    setPayments(allPayments);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFilteredPayments = () => {
    let filtered = [...payments];

    // Filter by period
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (filterPeriod) {
      case 'today':
        filtered = filtered.filter(p => p.date === today);
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(p => new Date(p.date) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(p => new Date(p.date) >= monthAgo);
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const studentName = studentMap.get(p.studentId) || '';
        return (
          studentName.toLowerCase().includes(query) ||
          p.method.toLowerCase().includes(query) ||
          p.notes?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  };

  const filteredPayments = getFilteredPayments();
  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // Group payments by date
  const groupedPayments: {[date: string]: Payment[]} = {};
  filteredPayments.forEach(payment => {
    if (!groupedPayments[payment.date]) {
      groupedPayments[payment.date] = [];
    }
    groupedPayments[payment.date].push(payment);
  });

  const dates = Object.keys(groupedPayments).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando historial...</Text>
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
        <Text style={styles.headerTitle}>Historial de Pagos</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por estudiante..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Period Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            {id: 'today', label: 'Hoy'},
            {id: 'week', label: 'Semana'},
            {id: 'month', label: 'Mes'},
            {id: 'all', label: 'Todo'},
          ].map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                filterPeriod === filter.id && styles.filterButtonActive,
              ]}
              onPress={() => setFilterPeriod(filter.id as FilterPeriod)}>
              <Text
                style={[
                  styles.filterButtonText,
                  filterPeriod === filter.id && styles.filterButtonTextActive,
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pagos</Text>
          <Text style={styles.summaryValue}>{filteredPayments.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValueLarge}>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>

      {/* Payments List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {dates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin pagos</Text>
            <Text style={styles.emptyText}>
              No hay pagos registrados para este periodo
            </Text>
          </View>
        ) : (
          dates.map(date => (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>{formatDate(date)}</Text>
                <Text style={styles.dateTotal}>
                  {formatCurrency(
                    groupedPayments[date].reduce((sum, p) => sum + p.amount, 0),
                  )}
                </Text>
              </View>

              {groupedPayments[date].map(payment => (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentLeft}>
                    <View style={styles.paymentAvatar}>
                      <Text style={styles.paymentAvatarText}>
                        {(studentMap.get(payment.studentId) || '?')
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentStudent}>
                        {studentMap.get(payment.studentId) || 'Estudiante'}
                      </Text>
                      <Text style={styles.paymentMeta}>
                        {payment.method}
                        {payment.bank ? ` • ${payment.bank}` : ''}
                      </Text>
                      <Text style={styles.paymentPeriod}>
                        {payment.month} {payment.year}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                    {payment.notes && (
                      <Text style={styles.paymentNotes} numberOfLines={1}>
                        {payment.notes}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
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
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    padding: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryValueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  dateTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentStudent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  paymentMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  paymentPeriod: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  paymentNotes: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    maxWidth: 100,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
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
