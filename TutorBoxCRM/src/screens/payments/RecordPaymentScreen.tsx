// RecordPaymentScreen - Record a new student payment
// Directors and Admins only

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import {PaymentService} from '../../services/PaymentService';
import {StudentService} from '../../services/StudentService';
import {Student} from '../../types';

interface Props {
  navigation: any;
  route?: {params?: {studentId?: string}};
}

const PAYMENT_METHODS = [
  {id: 'efectivo', label: 'Efectivo', icon: '💵'},
  {id: 'transferencia', label: 'Transferencia', icon: '🏦'},
  {id: 'nequi', label: 'Nequi', icon: '📱'},
  {id: 'daviplata', label: 'Daviplata', icon: '📲'},
];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function RecordPaymentScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const {isConnected} = useAuth();
  const preselectedStudentId = route?.params?.studentId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [bank, setBank] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    await StudentService.initialize();
    const allStudents = StudentService.getAllStudents() as Student[];
    const activeStudents = allStudents.filter(s => s.status === 'active');
    setStudents(activeStudents);

    // If preselected student, find and set it
    if (preselectedStudentId) {
      const student = activeStudents.find(s => s.id === preselectedStudentId);
      if (student) {
        setSelectedStudent(student);
      }
    }

    setLoading(false);
  };

  const filteredStudents = students.filter(s =>
    s.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentPicker(false);
    setSearchQuery('');
  };

  const validateForm = (): boolean => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Por favor selecciona un estudiante');
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return false;
    }
    if (!method) {
      Alert.alert('Error', 'Por favor selecciona un método de pago');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);

    const result = await PaymentService.recordPayment({
      studentId: selectedStudent!.id,
      amount: parseFloat(amount),
      method,
      bank: bank || undefined,
      month: MONTHS[selectedMonth],
      year: selectedYear,
      notes: notes || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      Alert.alert(
        'Pago Registrado',
        `Pago de $${parseFloat(amount).toLocaleString('es-CO')} registrado para ${selectedStudent!.nombre}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } else {
      Alert.alert('Error', result.error || 'No se pudo registrar el pago');
    }
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters
    const numeric = value.replace(/[^0-9]/g, '');
    return numeric;
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
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Pago</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView style={styles.content}>
          {/* Student Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estudiante</Text>
            <TouchableOpacity
              style={styles.studentSelector}
              onPress={() => setShowStudentPicker(true)}>
              {selectedStudent ? (
                <View style={styles.selectedStudent}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {selectedStudent.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.studentName}>{selectedStudent.nombre}</Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>
                  Seleccionar estudiante...
                </Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monto</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={text => setAmount(formatCurrency(text))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Método de Pago</Text>
            <View style={styles.methodsGrid}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.methodButton,
                    method === m.id && styles.methodButtonSelected,
                  ]}
                  onPress={() => setMethod(m.id)}>
                  <Text style={styles.methodIcon}>{m.icon}</Text>
                  <Text
                    style={[
                      styles.methodLabel,
                      method === m.id && styles.methodLabelSelected,
                    ]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bank (for transfers) */}
          {method === 'transferencia' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Banco</Text>
              <TextInput
                style={styles.textInput}
                value={bank}
                onChangeText={setBank}
                placeholder="Nombre del banco..."
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}

          {/* Month/Year */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes de Pago</Text>
            <View style={styles.monthYearRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.monthScroll}>
                {MONTHS.map((m, index) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.monthButton,
                      selectedMonth === index && styles.monthButtonSelected,
                    ]}
                    onPress={() => setSelectedMonth(index)}>
                    <Text
                      style={[
                        styles.monthButtonText,
                        selectedMonth === index && styles.monthButtonTextSelected,
                      ]}>
                      {m.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.yearSelector}>
              <TouchableOpacity
                style={styles.yearButton}
                onPress={() => setSelectedYear(selectedYear - 1)}>
                <Text style={styles.yearButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{selectedYear}</Text>
              <TouchableOpacity
                style={styles.yearButton}
                onPress={() => setSelectedYear(selectedYear + 1)}>
                <Text style={styles.yearButtonText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas (opcional)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas adicionales..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                Registrar Pago{' '}
                {amount ? `$${parseFloat(amount).toLocaleString('es-CO')}` : ''}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Student Picker Modal */}
      {showStudentPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Estudiante</Text>
              <TouchableOpacity onPress={() => setShowStudentPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar estudiante..."
              placeholderTextColor="#9ca3af"
              autoFocus
            />

            <ScrollView style={styles.studentList}>
              {filteredStudents.map(student => (
                <TouchableOpacity
                  key={student.id}
                  style={styles.studentItem}
                  onPress={() => handleSelectStudent(student)}>
                  <View style={styles.studentItemAvatar}>
                    <Text style={styles.studentItemAvatarText}>
                      {student.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.studentItemName}>{student.nombre}</Text>
                </TouchableOpacity>
              ))}
              {filteredStudents.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    No se encontraron estudiantes
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  studentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedStudent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    color: '#9ca3af',
  },
  chevron: {
    fontSize: 24,
    color: '#9ca3af',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#059669',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    padding: 0,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  methodButtonSelected: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  methodIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  methodLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  methodLabelSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  monthYearRow: {
    marginBottom: 12,
  },
  monthScroll: {
    flexGrow: 0,
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  monthButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  monthButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  monthButtonTextSelected: {
    color: '#ffffff',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  yearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  yearButtonText: {
    fontSize: 24,
    color: '#667eea',
    fontWeight: '600',
  },
  yearText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
    padding: 4,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  studentList: {
    maxHeight: 400,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  studentItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentItemAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  studentItemName: {
    fontSize: 16,
    color: '#1f2937',
  },
  noResults: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
