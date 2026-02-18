import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  createRecording,
  getRecordings,
  getClients,
  getLocationProfiles,
  Recording,
  Client,
  LocationProfile,
} from '../services/api';
import { HomeStackParamList } from '../navigation/types';

type HomeScreenProps = {
  user: { id: number; name: string; email: string; login_count?: number };
  token: string;
  onLogout: () => void;
};

export default function HomeScreen({ user, token, onLogout }: HomeScreenProps) {
  const stackNav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Dashboard data
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<LocationProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    try {
      const [recData, clientData, locData] = await Promise.all([
        getRecordings(token),
        getClients(token),
        getLocationProfiles(token),
      ]);
      setRecordings(recData.recordings);
      setClients(clientData.clients);
      setLocations(locData.profiles);
    } catch {} finally {
      setLoadingData(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    recordingRef.current = recording;
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    setIsRecording(true);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
    }, 1000);
  };

  const stopRecording = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recordingRef.current) { await recordingRef.current.stopAndUnloadAsync(); recordingRef.current = null; }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    setIsRecording(false);
    try {
      await createRecording(token, { duration_seconds: elapsedRef.current });
      await loadDashboard();
    } catch {}
    setElapsedSeconds(0);
    elapsedRef.current = 0;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!fontsLoaded) return null;

  const activeClients = clients.filter(c => c.is_active).length;
  const healthyClients = clients.filter(c => c.engagement_health === 'Good').length;
  const healthPct = clients.length > 0 ? Math.round((healthyClients / clients.length) * 100) : 0;

  const healthColor: Record<string, string> = { Good: '#16A34A', Neutral: '#D97706', Risk: '#DC2626' };

  const kpis = [
    { label: 'ENGAGEMENTS', value: activeClients.toString(), sub: 'Active Clients', badge: 'active', change: '+12.5%', up: true },
    { label: 'RECORDINGS', value: recordings.length.toString(), sub: 'Total Captured', badge: 'total', change: '+8.3%', up: true },
    { label: 'LOCATIONS', value: locations.length.toString(), sub: 'Sites Tracked', badge: 'tracked', change: '+5.2%', up: true },
    { label: 'HEALTH', value: `${healthPct}%`, sub: 'Clients Good', badge: 'score', change: '-3.1%', up: false },
  ];

  const firstName = user.name.split(' ')[0];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {firstName}!</Text>
            <Text style={styles.subGreeting}>What are you looking for today?</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live Dashboard</Text>
            </View>
          </View>
        </View>

        {/* KPI Cards */}
        {loadingData ? (
          <ActivityIndicator color="#3d7b5f" style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.kpiRow}>
            {kpis.map((kpi) => (
              <View key={kpi.label} style={styles.kpiCard}>
                <LinearGradient colors={['#3d7b5f', '#4a9d7a']} style={StyleSheet.absoluteFill} />
                <View style={styles.kpiTop}>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  <View style={styles.kpiBadge}>
                    <Text style={styles.kpiBadgeText}>{kpi.badge}</Text>
                  </View>
                </View>
                <Text style={styles.kpiValue}>{kpi.value}</Text>
                <View style={styles.kpiBottom}>
                  <Text style={styles.kpiSub}>{kpi.sub}</Text>
                  <Text style={[styles.kpiChange, !kpi.up && styles.kpiChangeDown]}>
                    {kpi.up ? '▲' : '▼'} {kpi.change}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Two Column Layout */}
        {!loadingData && (
          <View style={styles.columnsRow}>
            {/* Recent Engagements */}
            <View style={[styles.sectionCard, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.sectionTitle}>Recent Engagements</Text>
              {clients.length === 0 ? (
                <Text style={styles.emptyText}>No engagements yet</Text>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Client</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Code</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Health</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Tier</Text>
                  </View>
                  {clients.slice(0, 6).map((c) => (
                    <View key={c.id} style={styles.tableRow}>
                      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.healthDot, { backgroundColor: healthColor[c.engagement_health] || '#D97706' }]} />
                        <Text style={styles.tableCell} numberOfLines={1}>{c.client_name}</Text>
                      </View>
                      <Text style={[styles.tableCellLight, { flex: 1 }]}>{c.client_code}</Text>
                      <Text style={[styles.tableCell, { flex: 1, color: healthColor[c.engagement_health] || '#D97706' }]}>
                        {c.engagement_health}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.tierPill}>
                          <Text style={styles.tierPillText}>{c.client_tier}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Recent Recordings */}
            <View style={[styles.sectionCard, { flex: 1, marginLeft: 8 }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Recordings</Text>
                <TouchableOpacity
                  style={[styles.recButton, isRecording && styles.recButtonActive]}
                  onPress={isRecording ? stopRecording : startRecording}
                  activeOpacity={0.7}
                >
                  <Ionicons name={isRecording ? 'stop' : 'mic'} size={14} color="#FFFFFF" />
                  <Text style={styles.recButtonText}>
                    {isRecording ? `Stop ${fmt(elapsedSeconds)}` : 'Record'}
                  </Text>
                </TouchableOpacity>
              </View>
              {recordings.length === 0 ? (
                <Text style={styles.emptyText}>No recordings yet</Text>
              ) : (
                recordings.slice(0, 6).map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.recRow}
                    onPress={() => stackNav.navigate('RecordingDetail', { recordingId: r.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recIcon}>
                      <Ionicons name="mic" size={14} color="#3d7b5f" />
                    </View>
                    <View style={styles.recMeta}>
                      <Text style={styles.recTitle}>Recording · {fmt(r.duration_seconds || 0)}</Text>
                      <Text style={styles.recDate}>{fmtDate(r.created_at)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* Location Summary */}
        {!loadingData && locations.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Location Profiles</Text>
            <View style={styles.locGrid}>
              {locations.slice(0, 4).map((loc) => (
                <View key={loc.id} style={styles.locChip}>
                  <View style={[styles.locTypeDot, loc.type === 'base' ? styles.locBase : styles.locClient]} />
                  <Text style={styles.locName} numberOfLines={1}>{loc.name}</Text>
                  <Text style={styles.locType}>{loc.type === 'base' ? 'Base' : 'Client'}</Text>
                </View>
              ))}
            </View>
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
  greeting: {
    fontSize: 28,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(61,123,95,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(61,123,95,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3d7b5f',
    marginRight: 8,
  },
  liveText: {
    fontSize: 12,
    fontFamily: 'Oswald_500Medium',
    color: '#3d7b5f',
  },

  // KPI Cards
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  kpiBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kpiBadgeText: {
    fontSize: 10,
    fontFamily: 'Oswald_500Medium',
    color: '#FFFFFF',
  },
  kpiValue: {
    fontSize: 32,
    fontFamily: 'Oswald_700Bold',
    color: '#FFFFFF',
  },
  kpiBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  kpiChange: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
    color: '#BBF7D0',
  },
  kpiChangeDown: {
    color: '#FECACA',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },

  // Columns
  columnsRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },

  // Table
  table: {},
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f0',
  },
  tableCell: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },
  tableCellLight: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tierPill: {
    backgroundColor: 'rgba(61,123,95,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  tierPillText: {
    fontSize: 10,
    fontFamily: 'Oswald_500Medium',
    color: '#3d7b5f',
  },

  // Record Button
  recButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3d7b5f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  recButtonActive: {
    backgroundColor: '#DC2626',
  },
  recButtonText: {
    fontSize: 12,
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
  },

  // Recording Rows
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f0',
  },
  recIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(61,123,95,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recMeta: { flex: 1 },
  recTitle: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },
  recDate: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    marginTop: 2,
  },

  // Location chips
  locGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  locTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locBase: { backgroundColor: '#3d7b5f' },
  locClient: { backgroundColor: '#16A34A' },
  locName: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },
  locType: {
    fontSize: 10,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
  },
});
