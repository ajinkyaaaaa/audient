import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { getSentryEmployees, Employee } from '../services/api';

type SentryScreenProps = {
  token: string;
};

export default function SentryScreen({ token }: SentryScreenProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  // Pulsing dot animation
  const [pulseAnim] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const loadEmployees = useCallback(async () => {
    try {
      const data = await getSentryEmployees(token);
      setEmployees(data.employees);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEmployees();
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isRecentLogin = (iso: string | null) => {
    if (!iso) return false;
    const diffMs = Date.now() - new Date(iso).getTime();
    return diffMs < 12 * 60 * 60 * 1000; // within last 12 hours
  };

  if (!fontsLoaded) return null;

  const onlineCount = employees.filter(e => isRecentLogin(e.last_login_at)).length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3d7b5f" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Ionicons name="eye" size={24} color="#C05800" />
              <Text style={styles.title}>Sentry</Text>
            </View>
            <Text style={styles.subtitle}>Employee activity monitor</Text>
          </View>
          <View style={styles.onlineBadge}>
            <Animated.View style={[styles.onlineDot, { opacity: pulseAnim }]} />
            <Text style={styles.onlineText}>{onlineCount} Active Today</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{employees.length}</Text>
            <Text style={styles.statLabel}>Total Members</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{onlineCount}</Text>
            <Text style={styles.statLabel}>Active Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#9ca3af' }]}>{employees.length - onlineCount}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>

        {/* Employee List */}
        {loading ? (
          <ActivityIndicator color="#3d7b5f" style={{ marginTop: 40 }} />
        ) : employees.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#D4C8A0" />
            <Text style={styles.emptyTitle}>No employees yet</Text>
            <Text style={styles.emptyText}>Employees in your organization will appear here once they register and log in.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 2 }]}>Employee</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>Last Login</Text>
              <Text style={[styles.thText, { flex: 1 }]}>Status</Text>
              <Text style={[styles.thText, { flex: 0.8, textAlign: 'center' }]}>Logins</Text>
            </View>

            {employees.map((emp) => {
              const active = isRecentLogin(emp.last_login_at);
              const initials = emp.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <View key={emp.id} style={styles.row}>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.avatar, emp.role === 'admin' && styles.avatarAdmin]}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.empName} numberOfLines={1}>{emp.name}</Text>
                        {emp.role === 'admin' && (
                          <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.empEmail} numberOfLines={1}>{emp.email}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cellText, { flex: 1.5 }]}>{fmtDate(emp.last_login_at)}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.statusPill, active ? styles.statusActive : styles.statusInactive]}>
                      <View style={[styles.statusDot, { backgroundColor: active ? '#16A34A' : '#9ca3af' }]} />
                      <Text style={[styles.statusText, { color: active ? '#16A34A' : '#9ca3af' }]}>
                        {active ? 'Active' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cellText, { flex: 0.8, textAlign: 'center' }]}>{emp.login_count}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
    marginTop: 4,
    marginLeft: 34,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 8,
  },
  onlineText: {
    fontSize: 12,
    fontFamily: 'Oswald_500Medium',
    color: '#16A34A',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Oswald_500Medium',
    color: '#9ca3af',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },

  // List Card
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  thText: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f0',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(61,123,95,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarAdmin: {
    backgroundColor: 'rgba(192,88,0,0.12)',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Oswald_600SemiBold',
    color: '#3d7b5f',
  },
  empName: {
    fontSize: 14,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },
  empEmail: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    marginTop: 1,
  },
  adminBadge: {
    backgroundColor: 'rgba(192,88,0,0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  adminBadgeText: {
    fontSize: 9,
    fontFamily: 'Oswald_600SemiBold',
    color: '#C05800',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
  },

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(22,163,74,0.08)',
  },
  statusInactive: {
    backgroundColor: 'rgba(156,163,175,0.08)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Oswald_500Medium',
  },
});
