// StudentListScreen - Beautiful modern student list
// Teachers see limited info (no phone), Directors/Admins see full info

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {hasFeatureAccess} from '../../config/permissions.config';
import {StudentService} from '../../services/StudentService';
import {Student, StudentPublic} from '../../types';
import {Colors, Shadows, BorderRadius, Spacing} from '../../theme';

const {width} = Dimensions.get('window');

interface Props {
  navigation: any;
}

export default function StudentListScreen({navigation}: Props): React.JSX.Element {
  const {role, isConnected} = useAuth();
  const canSeePhone = role ? hasFeatureAccess(role, 'students', 'view_phone') : false;

  const [students, setStudents] = useState<(Student | StudentPublic)[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<(Student | StudentPublic)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [])
  );

  const loadStudents = async () => {
    setLoading(true);
    await StudentService.initialize();
    const allStudents = StudentService.getAllStudents();
    setStudents(allStudents);
    setFilteredStudents(allStudents);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await StudentService.refresh();
    const allStudents = StudentService.getAllStudents();
    setStudents(allStudents);
    filterStudents(searchQuery, allStudents);
    setRefreshing(false);
  };

  const filterStudents = (query: string, studentList?: (Student | StudentPublic)[]) => {
    const list = studentList || students;
    if (!query.trim()) {
      setFilteredStudents(list);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = list.filter(s =>
      s.nombre.toLowerCase().includes(lowerQuery)
    );
    setFilteredStudents(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    filterStudents(text);
  };

  const handleSelectStudent = (student: Student | StudentPublic) => {
    navigation.navigate('StudentDetail', {studentId: student.id});
  };

  const getModalityColors = (modality?: string): [string, string] => {
    const gradients: Record<string, [string, string]> = {
      Presencial: ['#667eea', '#764ba2'],
      Compañia: ['#48bb78', '#38a169'],
      Escuela: ['#ed8936', '#dd6b20'],
      Online: ['#4299e1', '#3182ce'],
      Privadas: ['#9f7aea', '#805ad5'],
    };
    return gradients[modality || ''] || ['#6b7280', '#4b5563'];
  };

  const getAvatarColors = (index: number): [string, string] => {
    const gradients: [string, string][] = [
      ['#667eea', '#764ba2'],
      ['#48bb78', '#38a169'],
      ['#ed8936', '#dd6b20'],
      ['#4299e1', '#3182ce'],
      ['#9f7aea', '#805ad5'],
      ['#fc8181', '#f56565'],
    ];
    return gradients[index % gradients.length];
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.success} />

      {/* Gradient Header */}
      <LinearGradient
        colors={['#48bb78', '#38a169']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>👥</Text>
              <View>
                <Text style={styles.headerTitle}>Estudiantes</Text>
                <Text style={styles.headerSubtitle}>
                  {students.length} registrados
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

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar estudiante..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearch('')}
                style={styles.clearButton}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredStudents.length} estudiante{filteredStudents.length !== 1 ? 's' : ''}
          {searchQuery ? ` encontrado${filteredStudents.length !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.success]}
            tintColor={Colors.success}
          />
        }>
        {/* Info banner for teachers */}
        {!canSeePhone && (
          <View style={styles.infoBanner}>
            <LinearGradient
              colors={['#eff6ff', '#dbeafe']}
              style={styles.infoBannerGradient}>
              <Text style={styles.infoBannerIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Los datos de contacto no están visibles para profesores
              </Text>
            </LinearGradient>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['#48bb78', '#38a169']}
              style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color={Colors.white} />
            </LinearGradient>
            <Text style={styles.loadingText}>Cargando estudiantes...</Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Sin resultados' : 'Sin estudiantes'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Intenta con otro término de búsqueda'
                : 'Los estudiantes aparecerán aquí'}
            </Text>
          </View>
        ) : (
          filteredStudents.map((student, index) => (
            <TouchableOpacity
              key={student.id}
              style={styles.studentCard}
              onPress={() => handleSelectStudent(student)}
              activeOpacity={0.7}>
              <LinearGradient
                colors={getAvatarColors(index)}
                style={styles.studentAvatar}>
                <Text style={styles.avatarText}>
                  {student.nombre.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {student.nombre}
                </Text>
                <View style={styles.studentMeta}>
                  {student.grupo && (
                    <View style={styles.groupBadge}>
                      <Text style={styles.groupText}>Grupo {student.grupo}</Text>
                    </View>
                  )}
                  {student.modalidad && (
                    <LinearGradient
                      colors={getModalityColors(student.modalidad)}
                      style={styles.modalityBadge}>
                      <Text style={styles.modalityText}>{student.modalidad}</Text>
                    </LinearGradient>
                  )}
                </View>
                {/* Show phone only for directors/admins */}
                {canSeePhone && 'telefono' in student && student.telefono && (
                  <View style={styles.phoneContainer}>
                    <Text style={styles.phoneIcon}>📱</Text>
                    <Text style={styles.phoneText}>{student.telefono}</Text>
                  </View>
                )}
              </View>
              <View style={styles.chevronContainer}>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))
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
    marginBottom: Spacing.md,
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
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.white,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  resultsBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  resultsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
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
  infoBanner: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  infoBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  infoBannerIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  infoText: {
    flex: 1,
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '500',
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.medium,
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  groupBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  groupText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modalityText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '600',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  phoneIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  phoneText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  chevron: {
    fontSize: 18,
    color: Colors.textLight,
    fontWeight: 'bold',
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
