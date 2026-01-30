// StudentDetailScreen - View student details
// Teachers see limited info (no phone), Directors/Admins see full info

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import {hasFeatureAccess} from '../../config/permissions.config';
import {StudentService} from '../../services/StudentService';
import {Student, StudentPublic} from '../../types';

interface Props {
  route: {params: {studentId: string}};
  navigation: any;
}

export default function StudentDetailScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const {studentId} = route.params;
  const {role, isConnected} = useAuth();
  const canSeePhone = role
    ? hasFeatureAccess(role, 'students', 'view_phone')
    : false;

  const [student, setStudent] = useState<Student | StudentPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  const loadStudent = async () => {
    setLoading(true);
    const studentData = StudentService.getStudentById(studentId);
    setStudent(studentData || null);
    setLoading(false);
  };

  const handleCall = () => {
    if (!canSeePhone || !student || !('telefono' in student)) return;

    const phone = student.telefono;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', 'No se puede realizar la llamada');
      });
    }
  };

  const handleWhatsApp = () => {
    if (!canSeePhone || !student || !('telefono' in student)) return;

    const phone = student.telefono?.replace(/\D/g, '');
    if (phone) {
      Linking.openURL(`whatsapp://send?phone=57${phone}`).catch(() => {
        Alert.alert('Error', 'WhatsApp no está instalado');
      });
    }
  };

  const handleViewProgress = () => {
    navigation.navigate('StudentProgress', {studentId});
  };

  const getModalityColor = (modality?: string) => {
    const colors: Record<string, string> = {
      Presencial: '#667eea',
      Compañia: '#10b981',
      Escuela: '#f59e0b',
      Online: '#06b6d4',
      Privadas: '#8b5cf6',
    };
    return colors[modality || ''] || '#6b7280';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#10b981' : '#ef4444';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando estudiante...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Estudiante</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>Estudiante no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFullStudent = 'telefono' in student;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estudiante</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {student.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.studentName}>{student.nombre}</Text>
          <View style={styles.badges}>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: getStatusColor(student.status)},
              ]}>
              <Text style={styles.badgeText}>
                {student.status === 'active' ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            {student.modalidad && (
              <View
                style={[
                  styles.modalityBadge,
                  {backgroundColor: getModalityColor(student.modalidad)},
                ]}>
                <Text style={styles.badgeText}>{student.modalidad}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions for Directors/Admins */}
        {canSeePhone && isFullStudent && student.telefono && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionText}>Llamar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.whatsappButton]}
              onPress={handleWhatsApp}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información General</Text>
          <View style={styles.infoCard}>
            {student.grupo && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Grupo</Text>
                <Text style={styles.infoValue}>Grupo {student.grupo}</Text>
              </View>
            )}
            {student.modalidad && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Modalidad</Text>
                <Text style={styles.infoValue}>{student.modalidad}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Info - Only for Directors/Admins */}
        {canSeePhone && isFullStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información de Contacto</Text>
            <View style={styles.infoCard}>
              {student.telefono && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Teléfono</Text>
                  <Text style={styles.infoValue}>{student.telefono}</Text>
                </View>
              )}
              {student.correo && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{student.correo}</Text>
                </View>
              )}
              {student.acudiente && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Acudiente</Text>
                  <Text style={styles.infoValue}>{student.acudiente}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Payment Info - Only for Directors/Admins */}
        {canSeePhone && isFullStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información de Pago</Text>
            <View style={styles.infoCard}>
              {student.tipoPago && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo de Pago</Text>
                  <Text style={styles.infoValue}>{student.tipoPago}</Text>
                </View>
              )}
              {student.valor && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Valor</Text>
                  <Text style={styles.infoValue}>
                    ${student.valor.toLocaleString()}
                  </Text>
                </View>
              )}
              {student.diaPago && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Día de Pago</Text>
                  <Text style={styles.infoValue}>{student.diaPago}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Info banner for teachers */}
        {!canSeePhone && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              ℹ️ Los datos de contacto y pagos no están visibles para profesores
            </Text>
          </View>
        )}

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progreso en Talky</Text>
          <TouchableOpacity
            style={styles.progressCard}
            onPress={handleViewProgress}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Ver Progreso</Text>
              <Text style={styles.progressSubtitle}>
                Avance en libros y unidades
              </Text>
            </View>
            <Text style={styles.progressChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Document Info - Only for Directors/Admins */}
        {canSeePhone && isFullStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentación</Text>
            <View style={styles.infoCard}>
              {student.tipoDoc && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo Documento</Text>
                  <Text style={styles.infoValue}>{student.tipoDoc}</Text>
                </View>
              )}
              {student.numDoc && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Número</Text>
                  <Text style={styles.infoValue}>{student.numDoc}</Text>
                </View>
              )}
              {student.fechaInicio && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha Inicio</Text>
                  <Text style={styles.infoValue}>
                    {new Date(student.fechaInicio).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
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
  },
  profileHeader: {
    backgroundColor: '#667eea',
    padding: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  infoBanner: {
    margin: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    color: '#1e40af',
    fontSize: 14,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  progressChevron: {
    fontSize: 24,
    color: '#9ca3af',
  },
});
