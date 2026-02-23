import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
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
  getOrgConfig,
  Employee,
  DateAttendanceRecord,
  OrgConfig,
} from '../services/api';

type SentryScreenProps = {
  token: string;
  currentUserId: number;
  userName: string;
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

export default function SentryScreen({ token, currentUserId, userName }: SentryScreenProps) {
  const navigation = useNavigation();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Org config
  const [orgData, setOrgData] = useState<Pick<OrgConfig, 'org_name' | 'join_code'>>({});

  // Calendar state
  const today = new Date();
  const todayStr = toDateStr(today);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [monthDots, setMonthDots] = useState<Record<string, number>>({});
  const [dateRecords, setDateRecords] = useState<DateAttendanceRecord[]>([]);
  const [loadingDate, setLoadingDate] = useState(false);

  // Members modal
  const [showMembers, setShowMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

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

  const loadMonthSummary = useCallback(async () => {
    try {
      const data = await getMonthSummary(token, calYear, calMonth + 1);
      setMonthDots(data.days);
    } catch {}
  }, [token, calYear, calMonth]);

  const loadDateAttendance = useCallback(async () => {
    setLoadingDate(true);
    try {
      const data = await getAttendanceByDate(token, selectedDate);
      setDateRecords(data.records);
    } catch {} finally {
      setLoadingDate(false);
    }
  }, [token, selectedDate]);

  useEffect(() => {
    getOrgConfig(token).then(data => {
      setOrgData({ org_name: data.config.org_name, join_code: data.config.join_code });
    }).catch(() => {});
  }, [token]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  useEffect(() => { loadMonthSummary(); }, [loadMonthSummary]);
  useEffect(() => { loadDateAttendance(); }, [loadDateAttendance]);

  // Refs so interval always calls latest versions
  const loadDateAttendanceRef = useRef(loadDateAttendance);
  useEffect(() => { loadDateAttendanceRef.current = loadDateAttendance; }, [loadDateAttendance]);
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  // Poll every 15s — employees always, date attendance only for today
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(() => {
      loadEmployees();
      if (selectedDateRef.current === toDateStr(new Date())) {
        loadDateAttendanceRef.current();
      }
    }, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadEmployees]);

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
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!fontsLoaded) return null;

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const awayCount = employees.filter(e => e.status === 'Away').length;
  const offlineCount = employees.filter(e => e.status === 'Offline').length;
  const calDays = getCalendarDays(calYear, calMonth);

  const selParts = selectedDate.split('-');
  const selDateObj = new Date(parseInt(selParts[0]), parseInt(selParts[1]) - 1, parseInt(selParts[2]));
  const selectedLabel = selectedDate === todayStr
    ? 'Today'
    : selDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Members modal data
  const searchLower = memberSearch.toLowerCase();
  const filteredEmployees = employees.filter(e =>
    (e.name.toLowerCase().includes(searchLower) || e.email.toLowerCase().includes(searchLower))
  );
  const modalAdmins = filteredEmployees.filter(e => e.role === 'admin');
  const modalEmployees = filteredEmployees.filter(e => e.role !== 'admin');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3d7b5f" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {Platform.OS !== 'web' && (
              <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
                <Ionicons name="menu" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            )}
            <View>
              <View style={styles.titleRow}>
                <Ionicons name="eye" size={24} color="#C05800" />
                <Text style={styles.title}>Sentry</Text>
              </View>
              <Text style={styles.adminName}>{userName}</Text>
              {(orgData.org_name || orgData.join_code) ? (
                <Text style={styles.orgInfo}>
                  {orgData.org_name}{orgData.org_name && orgData.join_code ? ' · ' : ''}{orgData.join_code}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
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

          <View style={styles.statPairsCol}>
            <View style={styles.statPairCard}>
              <View style={styles.statPairItem}>
                <Text style={styles.statPairValue}>{employees.length}</Text>
                <Text style={styles.statPairLabel}>Members</Text>
              </View>
              <View style={styles.statPairDivider} />
              <View style={styles.statPairItem}>
                <Text style={[styles.statPairValue, { color: '#16A34A' }]}>{activeCount}</Text>
                <Text style={styles.statPairLabel}>Active</Text>
              </View>
            </View>
            <View style={styles.statPairCard}>
              <View style={styles.statPairItem}>
                <Text style={[styles.statPairValue, { color: '#D97706' }]}>{awayCount}</Text>
                <Text style={styles.statPairLabel}>Away</Text>
              </View>
              <View style={styles.statPairDivider} />
              <View style={styles.statPairItem}>
                <Text style={[styles.statPairValue, { color: '#9ca3af' }]}>{offlineCount}</Text>
                <Text style={styles.statPairLabel}>Offline</Text>
              </View>
            </View>
          </View>
        </View>

        {/* View Members Button */}
        <TouchableOpacity style={styles.membersButton} onPress={() => setShowMembers(true)} activeOpacity={0.7}>
          <Ionicons name="people-outline" size={18} color="#4a5568" />
          <Text style={styles.membersButtonText}>Team Members ({employees.length})</Text>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </TouchableOpacity>

        {/* Date Attendance Section */}
        <View style={styles.listCard}>
          <View style={styles.dateHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar" size={18} color="#C05800" />
              <Text style={styles.sectionTitle}>Logins — {selectedLabel}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{dateRecords.length}</Text>
              </View>
              <TouchableOpacity onPress={loadDateAttendance} style={styles.refreshButton}>
                <Ionicons name="refresh" size={16} color="#4a5568" />
              </TouchableOpacity>
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
              const empStatus = employees.find(e => e.id === rec.user_id)?.status;
              const isActive = empStatus === 'Active';
              return (
                <View key={rec.id} style={styles.row}>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.avatar, rec.role === 'admin' && styles.avatarAdmin]}>
                      <Text style={[styles.avatarText, rec.role === 'admin' && { color: '#C05800' }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.empName} numberOfLines={1}>{rec.name}</Text>
                        {isYou && <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>}
                        {rec.role === 'admin' && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>}
                        {isActive && (
                          <View style={styles.activeBadge}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.empEmail} numberOfLines={1}>{rec.email}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cellText}>{fmtTime(rec.login_at)}</Text>
                    {rec.period && (
                      <View style={[styles.periodBadge, rec.period === 'Morning' ? styles.periodMorning : styles.periodEvening]}>
                        <Text style={[styles.periodBadgeText, rec.period === 'Morning' ? styles.periodMorningText : styles.periodEveningText]}>
                          {rec.period}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {rec.latitude && rec.longitude ? (
                      <View style={styles.gpsBadge}>
                        <Ionicons name="location" size={12} color="#3d7b5f" />
                        <Text style={styles.gpsText}>{rec.latitude.toFixed(3)}, {rec.longitude.toFixed(3)}</Text>
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
      </ScrollView>

      {/* Members Modal */}
      <Modal visible={showMembers} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Team Members</Text>
              <Text style={styles.modalSubtitle}>{employees.length} total · {activeCount} active now</Text>
            </View>
            <TouchableOpacity onPress={() => setShowMembers(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              placeholderTextColor="#9ca3af"
              value={memberSearch}
              onChangeText={setMemberSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {memberSearch.length > 0 && (
              <TouchableOpacity onPress={() => setMemberSearch('')}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Admins section */}
            {modalAdmins.length > 0 && (
              <>
                <Text style={styles.memberSectionLabel}>Admins</Text>
                {modalAdmins.map(emp => <MemberRow key={emp.id} emp={emp} currentUserId={currentUserId} fmtDate={fmtDate} />)}
              </>
            )}

            {/* Separator */}
            {modalAdmins.length > 0 && modalEmployees.length > 0 && (
              <View style={styles.memberSectionDivider} />
            )}

            {/* Employees section */}
            {modalEmployees.length > 0 && (
              <>
                <Text style={styles.memberSectionLabel}>Employees</Text>
                {modalEmployees.map(emp => <MemberRow key={emp.id} emp={emp} currentUserId={currentUserId} fmtDate={fmtDate} />)}
              </>
            )}

            {filteredEmployees.length === 0 && (
              <Text style={styles.emptyText}>No members match your search</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Member row sub-component ─────────────────────────────────────────────────
function MemberRow({ emp, currentUserId, fmtDate }: { emp: Employee; currentUserId: number; fmtDate: (iso: string | null) => string }) {
  const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isYou = emp.id === currentUserId;
  const statusColor = emp.status === 'Active' ? '#16A34A' : emp.status === 'Away' ? '#D97706' : '#9ca3af';
  const statusBg = emp.status === 'Active' ? 'rgba(22,163,74,0.08)' : emp.status === 'Away' ? 'rgba(217,119,6,0.08)' : 'rgba(156,163,175,0.08)';

  return (
    <View style={styles.memberRow}>
      <View style={[styles.avatar, emp.role === 'admin' && styles.avatarAdmin]}>
        <Text style={[styles.avatarText, emp.role === 'admin' && { color: '#C05800' }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.empName} numberOfLines={1}>{emp.name}</Text>
          {isYou && <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>}
          {emp.role === 'admin' && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>}
        </View>
        <Text style={styles.empEmail} numberOfLines={1}>{emp.email}</Text>
        <Text style={[styles.empEmail, { marginTop: 2 }]}>Last login: {fmtDate(emp.last_login_at)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{emp.status}</Text>
        </View>
        <Text style={styles.loginCountText}>{emp.login_count} logins</Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  hamburger: {
    padding: 4,
    marginTop: 2,
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
  adminName: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#4a5568',
    marginTop: 4,
    marginLeft: 34,
  },
  orgInfo: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    marginTop: 2,
    marginLeft: 34,
    letterSpacing: 0.5,
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

  // KPI row
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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

  // Calendar tile
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
  calRow: { flexDirection: 'row' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  calCellSelected: { backgroundColor: '#C05800' },
  calCellToday: { backgroundColor: 'rgba(61,123,95,0.1)' },
  calDayLabel: { fontSize: 8, fontFamily: 'Oswald_500Medium', color: '#9ca3af' },
  calDayText: { fontSize: 10, fontFamily: 'Oswald_500Medium', color: '#1a1a1a' },
  calDayTextSelected: { color: '#FFFFFF' },
  calDayTextToday: { color: '#3d7b5f', fontFamily: 'Oswald_700Bold' },
  calDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#C05800', marginTop: 1 },
  calDotSelected: { backgroundColor: '#FFFFFF' },

  // Members button
  membersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 16,
    gap: 10,
  },
  membersButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
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
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f5f5f0',
    justifyContent: 'center',
    alignItems: 'center',
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
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activeText: {
    fontSize: 9,
    fontFamily: 'Oswald_600SemiBold',
    color: '#16A34A',
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
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: 'Oswald_500Medium' },

  // Period badge
  periodBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  periodMorning: { backgroundColor: 'rgba(217,119,6,0.1)' },
  periodEvening: { backgroundColor: 'rgba(124,58,237,0.1)' },
  periodBadgeText: { fontSize: 9, fontFamily: 'Oswald_600SemiBold', textTransform: 'uppercase' },
  periodMorningText: { color: '#D97706' },
  periodEveningText: { color: '#7C3AED' },

  // Members Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    marginTop: 2,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#1a1a1a',
    paddingVertical: 0,
  },
  modalScroll: {
    flex: 1,
  },
  memberSectionLabel: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  memberSectionDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 24,
    marginTop: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f0',
  },
  loginCountText: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
  },
});
