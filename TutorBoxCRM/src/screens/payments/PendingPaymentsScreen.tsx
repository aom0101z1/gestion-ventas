// PendingPaymentsScreen - View students with pending/overdue payments
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
  Linking,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {PaymentService} from '../../services/PaymentService';
import {StudentService} from '../../services/StudentService';
import {Student, Payment} from '../../types';

interface Props {
  navigation: any;
}

interface PendingStudent {
  student: Student;
  lastPayment?: Payment;
  monthsOverdue: number;
}

export default function PendingPaymentsScreen({
  navigation,
}: Props): React.JSX.Element {
  const {isConnected} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    await PaymentService.initialize();
    await StudentService.initialize();

    const pending = PaymentService.getStudentsWithPendingPayments();
    setPendingStudents(pending as PendingStudent[]);

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

  const getUrgencyLevel = (months: number): 'low' | 'medium' | 'high' => {
    if (months >= 3) return 'high';
    if (months >= 2) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (urgency: 'low' | 'medium' | 'high') => {
    switch (urgency) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const handleRecordPayment = (studentId: string) => {
    navigation.navigate('RecordPayment', {studentId});
  };

  const handleCallStudent = (student: Student) => {
    if (student.telefono) {
      Linking.openURL(`tel:${student.telefono}`);
    } else {
      Alert.alert('Sin Telefono', 'Este estudiante no tiene telefono registrado');
    }
  };

  const handleWhatsApp = (student: Student) => {
    if (student.telefono) {
      const phone = student.telefono.replace(/\D/g, '');
      const message = `Hola, le escribimos de Ciudad Bilingue respecto al pago pendiente.`;
      Linking.openURL(`https://wa.me/57${phone}?text=${encodeURIComponent(message)}`);
    } else {
      Alert.alert('Sin Telefono', 'Este estudiante no tiene telefono registrado');
    }
  };

  // Statistics
  const totalPending = pendingStudents.length;
  const criticalCount = pendingStudents.filter(p => p.monthsOverdue >= 3).length;
  const warningCount = pendingStudents.filter(
    p => p.monthsOverdue >= 2 && p.monthsOverdue < 3,
  ).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando pendientes...</Text>
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
        <Text style={styles.headerTitle}>Pagos Pendientes</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalPending}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWarning]}>
          <Text style={[styles.statValue, styles.statValueWarning]}>
            {warningCount}
          </Text>
          <Text style={styles.statLabel}>2 meses</Text>
        </View>
        <View style={[styles.statCard, styles.statCardDanger]}>
          <Text style={[styles.statValue, styles.statValueDanger]}>
            {criticalCount}
          </Text>
          <Text style={styles.statLabel}>3+ meses</Text>
        </View>
      </View>

      {/* Pending List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {pendingStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Todo al dia!</Text>
            <Text style={styles.emptyText}>
              No hay estudiantes con pagos pendientes
            </Text>
          </View>
        ) : (
          pendingStudents.map(item => {
            const urgency = getUrgencyLevel(item.monthsOverdue);
            const urgencyColor = getUrgencyColor(urgency);

            return (
              <View key={item.student.id} style={styles.studentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.studentInfo}>
                    <View
                      style={[
                        styles.avatar,
                        {backgroundColor: urgencyColor + '20'},
                      ]}>
                      <Text style={[styles.avatarText, {color: urgencyColor}]}>
                        {item.student.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>
                        {item.student.nombre}
                      </Text>
                      {item.student.grupo && (
                        <Text style={styles.studentGroup}>
                          {item.student.grupo}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.urgencyBadge,
                      {backgroundColor: urgencyColor + '20'},
                    ]}>
                    <Text style={[styles.urgencyText, {color: urgencyColor}]}>
                      {item.monthsOverdue} {item.monthsOverdue === 1 ? 'mes' : 'meses'}
                    </Text>
                  </View>
                </View>

                {/* Last Payment Info */}
                <View style={styles.lastPaymentInfo}>
                  {item.lastPayment ? (
                    <Text style={styles.lastPaymentText}>
                      Ultimo pago: {formatCurrency(item.lastPayment.amount)} -{' '}
                      {new Date(item.lastPayment.date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  ) : (
                    <Text style={styles.neverPaidText}>
                      Sin pagos registrados
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCallStudent(item.student)}>
                    <Text style={styles.actionButtonIcon}>📞</Text>
                    <Text style={styles.actionButtonText}>Llamar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleWhatsApp(item.student)}>
                    <Text style={styles.actionButtonIcon}>💬</Text>
                    <Text style={styles.actionButtonText}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.payButton]}
                    onPress={() => handleRecordPayment(item.student.id)}>
                    <Text style={styles.actionButtonIcon}>💰</Text>
                    <Text style={[styles.actionButtonText, styles.payButtonText]}>
                      Registrar Pago
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statCardWarning: {
    backgroundColor: '#fef3c7',
  },
  statCardDanger: {
    backgroundColor: '#fee2e2',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statValueWarning: {
    color: '#b45309',
  },
  statValueDanger: {
    color: '#dc2626',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  studentCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  studentGroup: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastPaymentInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  lastPaymentText: {
    fontSize: 14,
    color: '#6b7280',
  },
  neverPaidText: {
    fontSize: 14,
    color: '#dc2626',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: '#059669',
    flex: 1.5,
  },
  payButtonText: {
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
