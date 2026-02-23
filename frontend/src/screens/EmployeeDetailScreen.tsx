import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  getSentryEmployees,
  getEmployeeAttendance,
  Employee,
  AttendanceRecord,
} from '../services/api';
import { SentryStackParamList } from '../navigation/types';
import MapView from '../components/MapView';

type Props = {
  token: string;
  employeeId: number;
  employeeName: string;
};

export default function EmployeeDetailScreen({ token, employeeId, employeeName }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<SentryStackParamList, 'EmployeeDetail'>>();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const loadEmployee = useCallback(async () => {
    try {
      const data = await getSentryEmployees(token);
      const emp = data.employees.find(e => e.id === employeeId);
      if (emp) setEmployee(emp);
    } catch {} finally {
      setLoading(false);
    }
  }, [token, employeeId]);

  const loadAttendance = useCallback(async () => {
    try {
      const data = await getEmployeeAttendance(token, employeeId);
      setAttendance(data.attendance);
    } catch {}
  }, [token, employeeId]);

  useEffect(() => {
    loadEmployee();
    loadAttendance();
  }, [loadEmployee, loadAttendance]);

  // Poll employee every 5s for live location updates
  const loadEmployeeRef = useRef(loadEmployee);
  useEffect(() => { loadEmployeeRef.current = loadEmployee; }, [loadEmployee]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadEmployeeRef.current();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Tick every second so sync age display counts up in real time
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtSyncAge = (iso: string | null) => {
    if (!iso) return null;
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const syncAge = useMemo(() => fmtSyncAge(employee?.last_sync_at ?? null), [employee?.last_sync_at, tick]);

  if (!fontsLoaded) return null;

  const hasLocation = !!(employee?.last_latitude && employee?.last_longitude);
  const initials = employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const statusColor = employee?.status === 'Active' ? '#16A34A' : employee?.status === 'Away' ? '#D97706' : '#9ca3af';
  const statusBg = employee?.status === 'Active' ? 'rgba(22,163,74,0.08)' : employee?.status === 'Away' ? 'rgba(217,119,6,0.08)' : 'rgba(156,163,175,0.08)';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{employeeName}</Text>
          <Text style={styles.headerSub}>Employee Profile</Text>
        </View>
        {employee && (
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{employee.status}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Map Section */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Ionicons name="location" size={16} color="#C05800" />
            <Text style={styles.mapTitle}>Location</Text>
            {syncAge && (
              <View style={styles.liveChip}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
                <Text style={styles.syncAgeText}>{syncAge}</Text>
              </View>
            )}
          </View>
          {loading ? (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator color="#3d7b5f" />
            </View>
          ) : hasLocation ? (
            <MapView
              latitude={employee!.last_latitude!}
              longitude={employee!.last_longitude!}
              style={styles.map}
            />
          ) : (
            <View style={styles.noLocation}>
              <Ionicons name="location-outline" size={32} color="#D4C8A0" />
              <Text style={styles.noLocationText}>No location data available</Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, employee?.role === 'admin' && styles.avatarAdmin]}>
              <Text style={[styles.avatarText, employee?.role === 'admin' && { color: '#C05800' }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.empName}>{employeeName}</Text>
              <Text style={styles.empEmail}>{employee?.email ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>
              {employee?.role ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1) : '—'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Logins</Text>
            <Text style={styles.infoValue}>{employee?.login_count ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Sync</Text>
            <Text style={[styles.infoValue, { fontFamily: 'Oswald_600SemiBold' }]}>
              {syncAge ?? fmtDate(employee?.last_sync_at ?? null)}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {employee?.created_at
                ? new Date(employee.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'}
            </Text>
          </View>
        </View>

        {/* Login History */}
        {attendance.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Login History</Text>
            <View style={styles.divider} />
            {attendance.slice(0, 15).map((a) => (
              <View key={a.id} style={styles.attendanceRow}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={styles.attendanceText}>
                  {a.login_at
                    ? new Date(a.login_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </Text>
                <Ionicons
                  name={a.latitude && a.longitude ? 'location' : 'location-outline'}
                  size={14}
                  color={a.latitude && a.longitude ? '#16A34A' : '#D4C8A0'}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 18,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: 'Oswald_500Medium' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },

  // Map card
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 12,
  },
  mapTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16A34A' },
  liveText: {
    fontSize: 9,
    fontFamily: 'Oswald_700Bold',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  syncAgeText: {
    fontSize: 11,
    fontFamily: 'Oswald_700Bold',
    color: '#16A34A',
    marginLeft: 2,
  },
  map: { height: 220 },
  mapPlaceholder: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noLocation: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  noLocationText: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
  },

  // Info card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(61,123,95,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAdmin: { backgroundColor: 'rgba(192,88,0,0.12)' },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Oswald_700Bold',
    color: '#3d7b5f',
  },
  empName: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },
  empEmail: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f5f5f0',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f0',
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'Oswald_500Medium',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },

  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },

  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f0',
  },
  attendanceText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
  },
});
