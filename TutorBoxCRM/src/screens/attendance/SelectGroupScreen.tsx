// SelectGroupScreen - Select a group to take attendance
// Shows teacher's assigned groups

import React, {useState, useEffect} from 'react';
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
import {useAuth} from '../../context/AuthContext';
import {GroupService} from '../../services/GroupService';
import {Group} from '../../types';

interface Props {
  navigation: any;
}

export default function SelectGroupScreen({navigation}: Props): React.JSX.Element {
  const {isConnected} = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [todaysGroups, setTodaysGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    await GroupService.initialize();

    const myGroups = GroupService.getMyGroups();
    const today = GroupService.getTodaysGroups();

    setGroups(myGroups);
    setTodaysGroups(today);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await GroupService.refresh();
    const myGroups = GroupService.getMyGroups();
    const today = GroupService.getTodaysGroups();
    setGroups(myGroups);
    setTodaysGroups(today);
    setRefreshing(false);
  };

  const selectGroup = (group: Group) => {
    navigation.navigate('TakeAttendance', {groupId: group.groupId});
  };

  const getDaysDisplay = (days: string[] | undefined) => {
    if (!days || days.length === 0) return 'Sin días';
    const shortDays: Record<string, string> = {
      Lunes: 'L',
      Martes: 'Ma',
      Miércoles: 'Mi',
      Jueves: 'J',
      Viernes: 'V',
      Sábado: 'S',
      Domingo: 'D',
    };
    return days.map(d => shortDays[d] || d).join('-');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Cargando grupos...</Text>
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
        <Text style={styles.title}>Seleccionar Grupo</Text>
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
        {/* Today's Classes */}
        {todaysGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Clases de Hoy</Text>
            {todaysGroups.map(group => (
              <TouchableOpacity
                key={group.groupId}
                style={[styles.groupCard, styles.todayCard]}
                onPress={() => selectGroup(group)}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>
                    {group.displayName || `Grupo ${group.groupId}`}
                  </Text>
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>HOY</Text>
                  </View>
                </View>
                <View style={styles.groupDetails}>
                  <Text style={styles.detailText}>
                    ⏰ {group.startTime} - {group.endTime}
                  </Text>
                  <Text style={styles.detailText}>
                    👥 {group.studentIds?.length || 0} estudiantes
                  </Text>
                </View>
                {group.room && (
                  <Text style={styles.locationText}>📍 {group.room}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* All Groups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📋 Todos mis Grupos ({groups.length})
          </Text>

          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No tienes grupos asignados</Text>
              <Text style={styles.emptySubtext}>
                Contacta al administrador para asignarte grupos
              </Text>
            </View>
          ) : (
            groups.map(group => (
              <TouchableOpacity
                key={group.groupId}
                style={styles.groupCard}
                onPress={() => selectGroup(group)}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>
                    {group.displayName || `Grupo ${group.groupId}`}
                  </Text>
                  <View
                    style={[
                      styles.modalityBadge,
                      {backgroundColor: getModalityColor(group.modality)},
                    ]}>
                    <Text style={styles.modalityText}>{group.modality}</Text>
                  </View>
                </View>
                <View style={styles.groupDetails}>
                  <Text style={styles.detailText}>
                    📆 {getDaysDisplay(group.days)}
                  </Text>
                  <Text style={styles.detailText}>
                    ⏰ {group.startTime} - {group.endTime}
                  </Text>
                  <Text style={styles.detailText}>
                    👥 {group.studentIds?.length || 0} estudiantes
                  </Text>
                </View>
                {group.book && (
                  <Text style={styles.bookText}>
                    📚 Book {group.book}
                    {group.unit ? ` - Unit ${group.unit}` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getModalityColor = (modality: string) => {
  const colors: Record<string, string> = {
    CB: '#667eea',
    COATS: '#10b981',
    NAZARETH: '#f59e0b',
    PRIVADO: '#8b5cf6',
    ONLINE: '#06b6d4',
  };
  return colors[modality] || '#6b7280';
};

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
  title: {
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  groupCard: {
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
  todayCard: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  todayBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalityText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  groupDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  bookText: {
    fontSize: 14,
    color: '#667eea',
    marginTop: 8,
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
