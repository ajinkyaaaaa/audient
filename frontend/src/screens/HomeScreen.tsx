import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { useAuth } from '../context/AuthContext';
import { getGeoNearby } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type HomeScreenProps = {
  user: { id: number; name: string; email: string; login_count?: number };
  token: string;
  onLogout: () => void;
};

type Visit = {
  id: string;
  clientCode: string;
  clientName: string;
  location: string;
  time: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
  type: 'assigned' | 'self';
  stakeholdersAdded: boolean;
};

// ─── Placeholder data (replace with API) ─────────────────────────────────────

const VISITS: Visit[] = [
  { id: '1', clientCode: 'ACM7X', clientName: 'Acme Corporation',  location: 'Downtown Office',   time: '09:00', status: 'completed',   type: 'assigned', stakeholdersAdded: true  },
  { id: '2', clientCode: 'BT3K9', clientName: 'Beta Technologies', location: 'Tech Park, Bldg C', time: '11:30', status: 'in-progress', type: 'assigned', stakeholdersAdded: false },
  { id: '3', clientCode: 'GS5R2', clientName: 'Gamma Solutions',   location: 'Whitefield',        time: '14:00', status: 'upcoming',    type: 'self',     stakeholdersAdded: false },
  { id: '4', clientCode: 'DE8W4', clientName: 'Delta Enterprises', location: 'CBD Area',          time: '16:30', status: 'upcoming',    type: 'assigned', stakeholdersAdded: false },
];

const STATUS_CONFIG = {
  'completed':   { label: 'Done',     color: '#16A34A', bg: 'rgba(22,163,74,0.1)',   strip: '#22C55E' },
  'in-progress': { label: 'Active',   color: '#D97706', bg: 'rgba(217,119,6,0.12)',  strip: '#F59E0B' },
  'upcoming':    { label: 'Upcoming', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', strip: '#D1D5DB' },
} as const;

// ─── VisitCard ─────────────────────────────────────────────────────────────────
// Extracted so the blinker animation hook is scoped per-card, not at screen level.

function VisitCard({ visit, onPress }: { visit: Visit; onPress: () => void }) {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visit.status !== 'in-progress') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.15, duration: 550, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,    duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visit.status, blinkAnim]);

  const s = STATUS_CONFIG[visit.status];

  return (
    <TouchableOpacity style={styles.visitCard} activeOpacity={0.72} onPress={onPress}>
      {/* Left status strip */}
      <View style={[styles.visitStrip, { backgroundColor: s.strip }]} />

      {/* Time + type pill */}
      <View style={styles.visitTimeCol}>
        <Text style={styles.visitTime}>{visit.time}</Text>
        <View style={[
          styles.visitTypePill,
          { backgroundColor: visit.type === 'assigned' ? 'rgba(79,126,232,0.12)' : 'rgba(192,88,0,0.1)' },
        ]}>
          <Text style={[
            styles.visitTypePillText,
            { color: visit.type === 'assigned' ? '#4F7EE8' : '#C05800' },
          ]}>
            {visit.type === 'assigned' ? 'Assigned' : 'Self'}
          </Text>
        </View>
      </View>

      {/* Code (primary) + client name + location */}
      <View style={styles.visitInfo}>
        <Text style={styles.visitCode}>{visit.clientCode}</Text>
        <Text style={styles.visitClient} numberOfLines={1}>{visit.clientName}</Text>
        <View style={styles.visitLocRow}>
          <Ionicons name="location-outline" size={11} color="#A89070" />
          <Text style={styles.visitLocation} numberOfLines={1}>{visit.location}</Text>
        </View>
      </View>

      {/* 3 fixed side-by-side icon slots */}
      <View style={styles.visitIcons}>
        {/* Slot 1 — visit status */}
        <View style={styles.visitIconSlot}>
          {visit.status === 'completed' && (
            <Ionicons name="checkbox" size={20} color="#22C55E" />
          )}
          {visit.status === 'in-progress' && (
            <Animated.View style={[styles.blinkDot, { opacity: blinkAnim }]} />
          )}
          {visit.status === 'upcoming' && (
            <Ionicons name="time-outline" size={20} color="#B0A898" />
          )}
        </View>

        {/* Slot 2 — stakeholder status */}
        <View style={styles.visitIconSlot}>
          {visit.status === 'completed' && (
            visit.stakeholdersAdded
              ? <Ionicons name="people"         size={19} color="#22C55E" />
              : <Ionicons name="people-outline" size={19} color="#F59E0B" />
          )}
          {visit.status === 'in-progress' && (
            <Ionicons name="people-outline" size={19} color="#F59E0B" />
          )}
          {visit.status === 'upcoming' && (
            <Ionicons name="people-outline" size={19} color="#B0A898" />
          )}
        </View>

        {/* Slot 3 — navigation chevron */}
        <View style={styles.visitIconSlot}>
          <Ionicons name="chevron-forward" size={15} color="#C8BFB0" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen({ user }: HomeScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>>();
  const { token } = useAuth();

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const [locationLabel, setLocationLabel] = useState<string>('—');

  // ── GPS → geo lookup on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        let lat: number, lng: number;
        if (Platform.OS === 'web') {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } else {
          const Location = await import('expo-location');
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
        const result = await getGeoNearby(token, lat, lng);
        setLocationLabel(result.label ?? 'Other');
      } catch {
        setLocationLabel('—');
      }
    })();
  }, [token]);

  // ── Shine animation — hooks must live before any early return ──────────────
  const [trackWidth, setTrackWidth] = useState(0);
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trackWidth) return;
    shineAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [trackWidth, shineAnim]);

  if (!fontsLoaded) return null;

  // Greeting
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.name.split(' ')[0];
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });

  // Stats derived from visit list
  const total    = VISITS.length;
  const done     = VISITS.filter(v => v.status === 'completed').length;
  const active   = VISITS.filter(v => v.status === 'in-progress').length;
  const pending  = VISITS.filter(v => v.status === 'upcoming').length;
  const assigned = VISITS.filter(v => v.type === 'assigned').length;
  const self     = VISITS.filter(v => v.type === 'self').length;
  const progress = total > 0 ? done / total : 0;

  const fillWidth = trackWidth * progress;
  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, fillWidth],
  });

  const topPad = Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 40 : 24;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                style={styles.menuBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="menu" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            )}
            <Text style={styles.greeting}>{greeting}, {firstName}</Text>
          </View>

          <View style={styles.locationChip}>
            <Ionicons name="location" size={11} color="#A89070" />
            <Text style={styles.locationChipText}>{locationLabel}</Text>
          </View>
        </View>

        {/* ── Hero Card ────────────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#243B2E', '#1A2820']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Header row */}
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroLabel}>TODAY'S OVERVIEW</Text>
              <Text style={styles.heroDate}>{dateStr}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{total} visits</Text>
            </View>
          </View>

          {/* Big number + mini stats */}
          <View style={styles.heroStatRow}>
            <View>
              <Text style={styles.heroNumber}>{done}</Text>
              <Text style={styles.heroNumberSub}>of {total} complete</Text>
            </View>

            <View style={styles.miniStatsBox}>
              <View style={styles.miniStat}>
                <View style={[styles.miniDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.miniValue}>{done}</Text>
                <Text style={styles.miniLabel}>Done</Text>
              </View>
              <View style={styles.miniDivider} />
              <View style={styles.miniStat}>
                <View style={[styles.miniDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.miniValue}>{active}</Text>
                <Text style={styles.miniLabel}>Active</Text>
              </View>
              <View style={styles.miniDivider} />
              <View style={styles.miniStat}>
                <View style={[styles.miniDot, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                <Text style={styles.miniValue}>{pending}</Text>
                <Text style={styles.miniLabel}>Pending</Text>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View
            style={styles.progressTrack}
            onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
          >
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]}>
              <Animated.View
                style={[styles.progressShine, { transform: [{ translateX: shineTranslate }] }]}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,160,60,0)',
                    'rgba(255,195,100,0.22)',
                    'rgba(255,225,150,0.82)',
                    'rgba(255,195,100,0.22)',
                    'rgba(255,160,60,0)',
                  ]}
                  locations={[0, 0.2, 0.5, 0.8, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>
          </View>
          <Text style={styles.progressLabel}>{Math.round(progress * 100)}% of today's visits completed</Text>

          {/* Type badges */}
          <View style={styles.typeBadgeRow}>
            <View style={[styles.typeBadge, styles.typeBadgeAssigned]}>
              <Ionicons name="person" size={12} color="#7EB3F7" />
              <Text style={[styles.typeBadgeText, { color: '#7EB3F7' }]}>Assigned</Text>
              <View style={styles.typeBadgeCount}>
                <Text style={[styles.typeBadgeCountText, { color: '#7EB3F7' }]}>{assigned}</Text>
              </View>
            </View>
            <View style={[styles.typeBadge, styles.typeBadgeSelf]}>
              <Ionicons name="add-circle-outline" size={12} color="#E8956A" />
              <Text style={[styles.typeBadgeText, { color: '#E8956A' }]}>Self-initiated</Text>
              <View style={[styles.typeBadgeCount, { backgroundColor: 'rgba(232,149,106,0.25)' }]}>
                <Text style={[styles.typeBadgeCountText, { color: '#E8956A' }]}>{self}</Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Start Next Visit</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Upcoming Visits ──────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>UPCOMING VISITS</Text>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>

        {VISITS.map((visit) => (
          <VisitCard
            key={visit.id}
            visit={visit}
            onPress={() => navigation.navigate('VisitDetail', {
              visitId: visit.id,
              clientCode: visit.clientCode,
              clientName: visit.clientName,
              time: visit.time,
              location: visit.location,
              status: visit.status,
              type: visit.type,
            })}
          />
        ))}

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.72}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(192,88,0,0.1)' }]}>
              <Ionicons name="add" size={20} color="#C05800" />
            </View>
            <Text style={styles.actionLabel}>Log Visit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.72}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(79,126,232,0.1)' }]}>
              <Ionicons name="map-outline" size={20} color="#4F7EE8" />
            </View>
            <Text style={styles.actionLabel}>View Map</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.72}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(107,114,128,0.1)' }]}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
            </View>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F4EF' },
  scroll: { paddingHorizontal: 20 },

  // ── Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontFamily: 'Oswald_700Bold', fontSize: 26, color: '#1a1a1a', letterSpacing: 0.2 },
  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E8DCC0',
  },
  locationChipText: { fontFamily: 'Oswald_500Medium', fontSize: 11, color: '#6B5540' },

  // ── Hero Card
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    marginBottom: 28,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLabel: {
    fontFamily: 'Oswald_600SemiBold', fontSize: 11,
    color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5,
  },
  heroDate: {
    fontFamily: 'Oswald_500Medium', fontSize: 15,
    color: 'rgba(255,255,255,0.75)', marginTop: 4,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeText: { fontFamily: 'Oswald_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  heroStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  heroNumber: { fontFamily: 'Oswald_700Bold', fontSize: 64, color: '#FFFFFF', lineHeight: 64 },
  heroNumberSub: { fontFamily: 'Oswald_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 6 },

  miniStatsBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, paddingHorizontal: 4, paddingVertical: 12,
  },
  miniStat: { alignItems: 'center', paddingHorizontal: 14 },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 7 },
  miniValue: { fontFamily: 'Oswald_700Bold', fontSize: 20, color: '#FFFFFF' },
  miniLabel: { fontFamily: 'Oswald_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 3 },
  miniDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },

  progressTrack: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    height: 8, backgroundColor: '#E07020', borderRadius: 4,
    overflow: 'hidden',
  },
  progressShine: {
    position: 'absolute', top: 0, bottom: 0, width: 140,
  },
  progressLabel: {
    fontFamily: 'Oswald_500Medium', fontSize: 12,
    color: 'rgba(255,255,255,0.5)', marginBottom: 18,
  },

  typeBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1,
  },
  typeBadgeAssigned: {
    backgroundColor: 'rgba(79,126,232,0.12)',
    borderColor: 'rgba(126,179,247,0.25)',
  },
  typeBadgeSelf: {
    backgroundColor: 'rgba(232,149,106,0.12)',
    borderColor: 'rgba(232,149,106,0.25)',
  },
  typeBadgeText: { fontFamily: 'Oswald_600SemiBold', fontSize: 12 },
  typeBadgeCount: {
    backgroundColor: 'rgba(126,179,247,0.22)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 2,
  },
  typeBadgeCountText: { fontFamily: 'Oswald_700Bold', fontSize: 12 },

  ctaBtn: {
    backgroundColor: '#C05800',
    borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  ctaBtnText: { fontFamily: 'Oswald_600SemiBold', fontSize: 15, color: '#FFFFFF', letterSpacing: 0.4 },

  // ── Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Oswald_600SemiBold', fontSize: 11,
    color: '#A89070', letterSpacing: 1.4,
  },
  sectionLink: { fontFamily: 'Oswald_500Medium', fontSize: 13, color: '#C05800' },

  // ── Visit cards
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDE8DF',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  visitStrip: { width: 3, alignSelf: 'stretch' },
  visitTimeCol: {
    paddingHorizontal: 12, paddingVertical: 16,
    alignItems: 'center', gap: 6, minWidth: 68,
  },
  visitTime: { fontFamily: 'Oswald_600SemiBold', fontSize: 14, color: '#1a1a1a' },
  visitTypePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  visitTypePillText: { fontFamily: 'Oswald_600SemiBold', fontSize: 10, letterSpacing: 0.2 },
  visitInfo: { flex: 1, paddingVertical: 14, paddingRight: 4 },
  visitCode: {
    fontFamily: 'Oswald_700Bold', fontSize: 16, color: '#1a1a1a', letterSpacing: 1,
  },
  visitClient: {
    fontFamily: 'Oswald_400Regular', fontSize: 12, color: '#6B5540', marginTop: 1, marginBottom: 5,
  },
  visitLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  visitLocation: { fontFamily: 'Oswald_400Regular', fontSize: 12, color: '#A89070', flex: 1 },

  // 3 equal fixed-width slots rendered side-by-side
  visitIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  visitIconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blinkDot: {
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#F59E0B',
    borderWidth: 2.5, borderColor: 'rgba(245,158,11,0.28)',
  },

  // ── Quick actions
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#EDE8DF',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontFamily: 'Oswald_600SemiBold', fontSize: 12, color: '#1a1a1a', letterSpacing: 0.2 },
});
