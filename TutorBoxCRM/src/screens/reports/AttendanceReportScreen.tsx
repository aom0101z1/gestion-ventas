// AttendanceReportScreen - Attendance summary report
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
import {GroupService} from '../../services/GroupService';
import {AttendanceRecord, Group} from '../../types';

interface Props {
  navigation: any;
}

type FilterPeriod = 'week' | 'month' | 'all';
type ViewMode = 'byDate' | 'byGroup';

interface GroupStats {
  group: Group;
  totalClasses: number;
  avgAttendance: number;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
}

interface DateStats {
  date: string;
  classes: number;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

export default function AttendanceReportScreen({
  navigation,
}: Props): React.JSX.Element {
  const {isConnected} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('byDate');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    setLoading(true);
    await AttendanceService.initialize();
    await GroupService.initialize();

    const allRecords = await AttendanceService.fetchAllRecords();
    setRecords(allRecords);
    setGroups(GroupService.getAllGroups());

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredRecords = (): AttendanceRecord[] => {
    const now = new Date();
    let filtered = [...records];

    switch (filterPeriod) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(r => new Date(r.date) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(r => new Date(r.date) >= monthAgo);
        break;
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  const filteredRecords = getFilteredRecords();

  // Calculate overall stats
  const totalClasses = filteredRecords.length;
  const totalPresent = filteredRecords.reduce(
    (sum, r) => sum + r.studentsPresent,
    0,
  );
  const totalLate = filteredRecords.reduce((sum, r) => sum + r.studentsLate, 0);
  const totalAbsent = filteredRecords.reduce(
    (sum, r) => sum + r.studentsAbsent,
    0,
  );
  const totalStudents = totalPresent + totalLate + totalAbsent;
  const overallRate =
    totalStudents > 0 ? ((totalPresent + totalLate) / totalStudents) * 100 : 0;

  // Group by date stats
  const getDateStats = (): DateStats[] => {
    const dateMap: {[date: string]: DateStats} = {};

    filteredRecords.forEach(record => {
      if (!dateMap[record.date]) {
        dateMap[record.date] = {
          date: record.date,
          classes: 0,
          present: 0,
          late: 0,
          absent: 0,
          rate: 0,
        };
      }
      dateMap[record.date].classes++;
      dateMap[record.date].present += record.studentsPresent;
      dateMap[record.date].late += record.studentsLate;
      dateMap[record.date].absent += record.studentsAbsent;
    });

    // Calculate rates
    Object.values(dateMap).forEach(stat => {
      const total = stat.present + stat.late + stat.absent;
      stat.rate = total > 0 ? ((stat.present + stat.late) / total) * 100 : 0;
    });

    return Object.values(dateMap).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  // Group by group stats
  const getGroupStats = (): GroupStats[] => {
    const groupMap: {[groupId: number]: GroupStats} = {};

    groups.forEach(group => {
      groupMap[group.groupId] = {
        group,
        totalClasses: 0,
        avgAttendance: 0,
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0,
      };
    });

    filteredRecords.forEach(record => {
      if (groupMap[record.groupId]) {
        groupMap[record.groupId].totalClasses++;
        groupMap[record.groupId].totalPresent += record.studentsPresent;
        groupMap[record.groupId].totalLate += record.studentsLate;
        groupMap[record.groupId].totalAbsent += record.studentsAbsent;
      }
    });

    // Calculate averages
    Object.values(groupMap).forEach(stat => {
      const total = stat.totalPresent + stat.totalLate + stat.totalAbsent;
      stat.avgAttendance =
        total > 0 ? ((stat.totalPresent + stat.totalLate) / total) * 100 : 0;
    });

    return Object.values(groupMap)
      .filter(s => s.totalClasses > 0)
      .sort((a, b) => b.totalClasses - a.totalClasses);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
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
        <Text style={styles.headerTitle}>Reporte de Asistencia</Text>
        {!isConnected && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Period Filter */}
      <View style={styles.filterContainer}>
        {[
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
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryMainValue}>{overallRate.toFixed(1)}%</Text>
          <Text style={styles.summaryMainLabel}>Asistencia Promedio</Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{totalClasses}</Text>
            <Text style={styles.summaryStatLabel}>Clases</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryStatValue, styles.presentValue]}>
              {totalPresent}
            </Text>
            <Text style={styles.summaryStatLabel}>Presentes</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryStatValue, styles.lateValue]}>
              {totalLate}
            </Text>
            <Text style={styles.summaryStatLabel}>Tardanzas</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryStatValue, styles.absentValue]}>
              {totalAbsent}
            </Text>
            <Text style={styles.summaryStatLabel}>Ausentes</Text>
          </View>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'byDate' && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode('byDate')}>
          <Text
            style={[
              styles.viewModeText,
              viewMode === 'byDate' && styles.viewModeTextActive,
            ]}>
            Por Fecha
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'byGroup' && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode('byGroup')}>
          <Text
            style={[
              styles.viewModeText,
              viewMode === 'byGroup' && styles.viewModeTextActive,
            ]}>
            Por Grupo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {viewMode === 'byDate' ? (
          // By Date View
          getDateStats().map(stat => (
            <View key={stat.date} style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardTitle}>{formatDate(stat.date)}</Text>
                <View
                  style={[
                    styles.rateBadge,
                    {
                      backgroundColor:
                        stat.rate >= 80 ? '#dcfce7' : stat.rate >= 60 ? '#fef3c7' : '#fee2e2',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.rateBadgeText,
                      {
                        color:
                          stat.rate >= 80 ? '#059669' : stat.rate >= 60 ? '#b45309' : '#dc2626',
                      },
                    ]}>
                    {stat.rate.toFixed(0)}%
                  </Text>
                </View>
              </View>
              <View style={styles.statCardBody}>
                <View style={styles.statCardItem}>
                  <Text style={styles.statCardItemLabel}>Clases</Text>
                  <Text style={styles.statCardItemValue}>{stat.classes}</Text>
                </View>
                <View style={styles.statCardItem}>
                  <Text style={styles.statCardItemLabel}>Presentes</Text>
                  <Text style={[styles.statCardItemValue, styles.presentValue]}>
                    {stat.present}
                  </Text>
                </View>
                <View style={styles.statCardItem}>
                  <Text style={styles.statCardItemLabel}>Tardanzas</Text>
                  <Text style={[styles.statCardItemValue, styles.lateValue]}>
                    {stat.late}
                  </Text>
                </View>
                <View style={styles.statCardItem}>
                  <Text style={styles.statCardItemLabel}>Ausentes</Text>
                  <Text style={[styles.statCardItemValue, styles.absentValue]}>
                    {stat.absent}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          // By Group View
          getGroupStats().map(stat => (
            <View key={stat.group.groupId} style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <View style={styles.groupInfo}>
                  <Text style={styles.statCardTitle}>
                    {stat.group.displayName}
                  </Text>
                  <Text style={styles.groupMeta}>
                    {stat.group.daysShort} • {stat.group.startTime}
                  </Text>
                </View>
                <View
                  style={[
                    styles.rateBadge,
                    {
                      backgroundColor:
                        stat.avgAttendance >= 80
                          ? '#dcfce7'
                          : stat.avgAttendance >= 60
                          ? '#fef3c7'
                          : '#fee2e2',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.rateBadgeText,
                      {
                        color:
                          stat.avgAttendance >= 80
                            ? '#059669'
                            : stat.avgAttendance >= 60
                            ? '#b45309'
                            : '#dc2626',
                      },
                    ]}>
                    {stat.avgAttendance.toFixed(0)}%
                  </Text>
                </View>
              </View>
              <View style={styles.statCardBody}>
                <View style={styles.statCardItem}>
                  <Text style={styles.statCardItemLabel}>Clases</Text>
                  <Text style={styles.statCardItemValue}>
                    {stat.totalClasses}
                  </Text>
                </View>
                <View style={styles.statCardItem}>
                  <Text style={styles.statCardItemLabel}>Presentes</Text>
                  <Text style={[styles.statCardItemValue, styles.presentValue]}>
                    {stat.totalPresent}
                  </Text>
                </View>
                <View style={styles.statCardItem}>
                  <Text style={styles.statCardItemLabel}>Tardanzas</Text>
                  <Text style={[styles.statCardItemValue, styles.lateValue]}>
                    {stat.totalLate}
                  </Text>
                </View>
                <View style={styles.statCardItem}>
                  <Text style={styles.statCardItemLabel}>Ausentes</Text>
                  <Text style={[styles.statCardItemValue, styles.absentValue]}>
                    {stat.totalAbsent}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {filteredRecords.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin registros</Text>
            <Text style={styles.emptyText}>
              No hay registros de asistencia para este periodo
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
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
  summaryContainer: {
    backgroundColor: '#667eea',
    padding: 20,
  },
  summaryMain: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryMainValue: {
    fontSize: 48,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  presentValue: {
    color: '#10b981',
  },
  lateValue: {
    color: '#f59e0b',
  },
  absentValue: {
    color: '#ef4444',
  },
  viewModeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  viewModeButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  viewModeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  viewModeTextActive: {
    color: '#667eea',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statCard: {
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
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupInfo: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  groupMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rateBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCardItem: {
    alignItems: 'center',
  },
  statCardItemLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statCardItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
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
