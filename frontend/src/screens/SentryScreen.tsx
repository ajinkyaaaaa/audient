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
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  getSentryEmployees,
  getAttendanceByDate,
  getMonthSummary,
  Employee,
  DateAttendanceRecord,
} from '../services/api';

type SentryScreenProps = {
  token: string;
  currentUserId: number;
};

// Calendar helpers
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

export default function SentryScreen({ token, currentUserId }: SentryScreenProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  const [monthDots, setMonthDots] = useState<Record<string, number>>({});
  const [dateRecords, setDateRecords] = useState<DateAttendanceRecord[]>([]);
  const [loadingDate, setLoadingDate] = useState(false);

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

  // Load month summary for calendar dots
  const loadMonthSummary = useCallback(async () => {
    try {
      const data = await getMonthSummary(token, calYear, calMonth + 1);
      setMonthDots(data.days);
    } catch {}
  }, [token, calYear, calMonth]);

  // Load attendance for selected date
  const loadDateAttendance = useCallback(async () => {
    setLoadingDate(true);
    try {
      const data = await getAttendanceByDate(token, selectedDate);
      setDateRecords(data.records);
    } catch {} finally {
      setLoadingDate(false);
    }
  }, [token, selectedDate]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  useEffect(() => { loadMonthSummary(); }, [loadMonthSummary]);
  useEffect(() => { loadDateAttendance(); }, [loadDateAttendance]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEmployees();
    loadMonthSummary();
    loadDateAttendance();
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
    else setCalMonth(calMonth + 1);
  };

  const onDayPress = (day: number) => {
    const m = String(calMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    setSelectedDate(`${calYear}-${m}-${d}`);
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

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isRecentLogin = (iso: string | null) => {
    if (!iso) return false;
    const diffMs = Date.now() - new Date(iso).getTime();
    return diffMs < 12 * 60 * 60 * 1000;
  };

  if (!fontsLoaded) return null;

  const onlineCount = employees.filter(e => isRecentLogin(e.last_login_at)).length;
  const calDays = getCalendarDays(calYear, calMonth);
  const todayStr = toDateStr(today);

  // Format selected date for display
  const selParts = selectedDate.split('-');
  const selDateObj = new Date(parseInt(selParts[0]), parseInt(selParts[1]) - 1, parseInt(selParts[2]));
  const selectedLabel = selectedDate === todayStr
    ? 'Today'
    : selDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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

        {/* KPI Row — calendar first, then compact stat pairs */}
        <View style={styles.kpiRow}>
          {/* Compact Calendar Tile */}
          <View style={styles.calendarCard}>
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={prevMonth} style={styles.calArrow}>
                <Ionicons name="chevron-back" size={14} color="#4a5568" />
              </TouchableOpacity>
              <Text style={styles.calMonthText}>{MONTH_NAMES[calMonth].slice(0, 3)} {calYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calArrow}>
                <Ionicons name="chevron-forward" size={14} color="#4a5568" />
              </TouchableOpacity>
            </View>
            <View style={styles.calRow}>
              {DAY_LABELS.map(d => (
                <View key={d} style={styles.calCell}>
                  <Text style={styles.calDayLabel}>{d[0]}</Text>
                </View>
              ))}
            </View>
            <View style={styles.calGrid}>
              {calDays.map((day, i) => {
                if (day === null) return <View key={`empty-${i}`} style={styles.calCell} />;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const hasLogins = monthDots[dateStr] && monthDots[dateStr] > 0;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.calCell, isSelected && styles.calCellSelected, isToday && !isSelected && styles.calCellToday]}
                    onPress={() => onDayPress(day)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected, isToday && !isSelected && styles.calDayTextToday]}>
                      {day}
                    </Text>
                    {hasLogins && <View style={[styles.calDot, isSelected && styles.calDotSelected]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Compact stat pairs */}
          <View style={styles.statPairsCol}>
            <View style={styles.statPairCard}>
              <View style={styles.statPairItem}>
                <Text style={styles.statPairValue}>{employees.length}</Text>
                <Text style={styles.statPairLabel}>Members</Text>
              </View>
              <View style={styles.statPairDivider} />
              <View style={styles.statPairItem}>
                <Text style={[styles.statPairValue, { color: '#16A34A' }]}>{onlineCount}</Text>
                <Text style={styles.statPairLabel}>Active</Text>
              </View>
            </View>
            <View style={styles.statPairCard}>
              <View style={styles.statPairItem}>
                <Text style={[styles.statPairValue, { color: '#9ca3af' }]}>{employees.length - onlineCount}</Text>
                <Text style={styles.statPairLabel}>Offline</Text>
              </View>
              <View style={styles.statPairDivider} />
              <View style={styles.statPairItem}>
                <Text style={[styles.statPairValue, { color: '#C05800' }]}>{dateRecords.length}</Text>
                <Text style={styles.statPairLabel}>Today</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Date Attendance Section */}
        <View style={styles.listCard}>
          <View style={styles.dateHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar" size={18} color="#C05800" />
              <Text style={styles.sectionTitle}>Logins — {selectedLabel}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{dateRecords.length}</Text>
            </View>
          </View>

          {loadingDate ? (
            <ActivityIndicator color="#3d7b5f" style={{ marginVertical: 20 }} />
          ) : dateRecords.length === 0 ? (
            <Text style={styles.emptyText}>No logins on this date</Text>
          ) : (
            dateRecords.map((rec) => {
              const initials = rec.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const isYou = rec.user_id === currentUserId;
              return (
                <View key={rec.id} style={styles.row}>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.avatar, rec.role === 'admin' && styles.avatarAdmin]}>
                      <Text style={[styles.avatarText, rec.role === 'admin' && { color: '#C05800' }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.empName} numberOfLines={1}>{rec.name}</Text>
                        {isYou && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                        {rec.role === 'admin' && (
                          <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.empEmail} numberOfLines={1}>{rec.email}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cellText, { flex: 1 }]}>{fmtTime(rec.login_at)}</Text>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {rec.latitude && rec.longitude ? (
                      <View style={styles.gpsBadge}>
                        <Ionicons name="location" size={12} color="#3d7b5f" />
                        <Text style={styles.gpsText}>
                          {rec.latitude.toFixed(3)}, {rec.longitude.toFixed(3)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.cellText, { color: '#D4C8A0' }]}>No GPS</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* All Employees Overview */}
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
            <Text style={styles.sectionTitle}>All Members</Text>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 2 }]}>Employee</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>Last Login</Text>
              <Text style={[styles.thText, { flex: 1 }]}>Status</Text>
              <Text style={[styles.thText, { flex: 0.8, textAlign: 'center' }]}>Logins</Text>
            </View>

            {employees.map((emp) => {
              const active = isRecentLogin(emp.last_login_at);
              const isYou = emp.id === currentUserId;
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
                      <Text style={[styles.avatarText, emp.role === 'admin' && { color: '#C05800' }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.empName} numberOfLines={1}>{emp.name}</Text>
                        {isYou && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
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

  // KPI row — calendar + compact stat pairs
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statPairsCol: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  statPairCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  statPairItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  statPairDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  statPairValue: {
    fontSize: 24,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  statPairLabel: {
    fontSize: 10,
    fontFamily: 'Oswald_500Medium',
    color: '#9ca3af',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Compact Calendar tile
  calendarCard: {
    flex: 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calArrow: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#f5f5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calMonthText: {
    fontSize: 12,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },
  calRow: {
    flexDirection: 'row',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: `${100 / 7}%`,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  calCellSelected: {
    backgroundColor: '#C05800',
  },
  calCellToday: {
    backgroundColor: 'rgba(61,123,95,0.1)',
  },
  calDayLabel: {
    fontSize: 8,
    fontFamily: 'Oswald_500Medium',
    color: '#9ca3af',
  },
  calDayText: {
    fontSize: 10,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
  },
  calDayTextToday: {
    color: '#3d7b5f',
    fontFamily: 'Oswald_700Bold',
  },
  calDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#C05800',
    marginTop: 1,
  },
  calDotSelected: {
    backgroundColor: '#FFFFFF',
  },

  // Date attendance section
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  countBadge: {
    backgroundColor: 'rgba(192,88,0,0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 12,
    fontFamily: 'Oswald_600SemiBold',
    color: '#C05800',
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
    paddingVertical: 16,
  },

  // List Card
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
    marginTop: -8,
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
  youBadge: {
    backgroundColor: 'rgba(61,123,95,0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youBadgeText: {
    fontSize: 9,
    fontFamily: 'Oswald_700Bold',
    color: '#3d7b5f',
    textTransform: 'uppercase',
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

  // GPS badge
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(61,123,95,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gpsText: {
    fontSize: 10,
    fontFamily: 'Oswald_400Regular',
    color: '#3d7b5f',
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
