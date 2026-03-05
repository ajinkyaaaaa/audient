import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Linking,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  getClient,
  getStakeholders,
  createStakeholder,
  deleteStakeholder,
  getVisits,
  createVisit,
  deleteVisit,
  getLocationProfiles,
  Client,
  Stakeholder,
  Visit,
} from '../services/api';
import ClientLocationMap from '../components/ClientLocationMap';
// DateTimePicker only available on native
const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;

// ── Constants ──────────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  Good: '#22C55E',
  Neutral: '#F59E0B',
  Risk: '#EF4444',
};

const HEALTH_PROGRESS: Record<string, number> = {
  Good: 1.0,
  Neutral: 0.5,
  Risk: 0.25,
};

const TIER_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  Strategic: { bg: 'rgba(192,88,0,0.1)', text: '#C05800', border: 'rgba(192,88,0,0.28)' },
  Normal:    { bg: '#F5F4EF',             text: '#6B5540', border: '#E8DCC0' },
  'Low Touch': { bg: '#FAFAF8',           text: '#A89070', border: '#EDE8DF' },
};

const MONOSPACE_FONT = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'monospace',
});

// ── Utility functions ──────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function driveMinutes(km: number): number {
  return Math.max(1, Math.ceil((km / 30) * 60));
}

function formatDriveTime(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function estimateLocalTime(longitude: number): string {
  const offsetHours = Math.round(longitude / 15);
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const localDate = new Date(utcMs + offsetHours * 3600000);
  return localDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function openGoogleMaps(lat: number, lng: number, label: string) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(label)}`;
  Linking.openURL(url).catch(() => {});
}

function openAppleMaps(lat: number, lng: number, label: string) {
  const url = `maps://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(label)}`;
  Linking.openURL(url).catch(() => openGoogleMaps(lat, lng, label));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.8, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: color,
          opacity: 0.22,
          transform: [{ scale: pulse }],
        }}
      />
      <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: color }} />
    </View>
  );
}

// Circular progress gauge — half-circle clip technique (no SVG required)
function EngagementRing({ health }: { health: string }) {
  const SIZE = 96;
  const THICKNESS = 9;
  const center = SIZE / 2;

  const color = HEALTH_COLOR[health] || '#F59E0B';
  const progress = HEALTH_PROGRESS[health] || 0.5;
  const label = Math.round(progress * 100).toString();

  // Right half covers 0→180° (progress 0→50%)
  const rightDeg = Math.min(progress * 360, 180) - 180;
  // Left half covers 180→360° (progress 50→100%)
  const leftDeg = progress > 0.5 ? (progress - 0.5) * 360 - 180 : -180;

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      {/* Gray background ring */}
      <View
        style={{
          position: 'absolute',
          width: SIZE,
          height: SIZE,
          borderRadius: center,
          borderWidth: THICKNESS,
          borderColor: '#E8DCC0',
        }}
      />

      {/* Right half fill — clip to right side, rotate colored top-right arc */}
      <View
        style={{
          position: 'absolute',
          left: center,
          top: 0,
          width: center,
          height: SIZE,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: -center,
            top: 0,
            width: SIZE,
            height: SIZE,
            borderRadius: center,
            borderWidth: THICKNESS,
            borderTopColor: color,
            borderRightColor: color,
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: [{ rotate: `${rightDeg}deg` }],
          }}
        />
      </View>

      {/* Left half fill — only rendered when progress > 50% */}
      {progress > 0.5 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: center,
            height: SIZE,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: SIZE,
              height: SIZE,
              borderRadius: center,
              borderWidth: THICKNESS,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              borderLeftColor: color,
              transform: [{ rotate: `${leftDeg}deg` }],
            }}
          />
        </View>
      )}

      {/* Inner circle */}
      <View
        style={{
          position: 'absolute',
          top: THICKNESS,
          left: THICKNESS,
          right: THICKNESS,
          bottom: THICKNESS,
          borderRadius: center - THICKNESS,
          backgroundColor: '#FDFBD4',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 22, fontFamily: 'Oswald_700Bold', color, lineHeight: 26 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 7, fontFamily: 'Oswald_600SemiBold', color: '#A89070', letterSpacing: 1.2 }}>
          PULSE
        </Text>
      </View>
    </View>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG['Normal'];
  return (
    <View
      style={{
        backgroundColor: cfg.bg,
        borderWidth: 1,
        borderColor: cfg.border,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 11, fontFamily: 'Oswald_600SemiBold', color: cfg.text, letterSpacing: 0.3 }}>
        {tier}
      </Text>
    </View>
  );
}

function CreatorChip({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: 'rgba(192,88,0,0.12)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 8, fontFamily: 'Oswald_700Bold', color: '#C05800' }}>{initials}</Text>
      </View>
      <Text style={{ fontSize: 12, fontFamily: 'Oswald_500Medium', color: '#1a1a1a' }} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={qaStyles.chip} onPress={onPress} activeOpacity={0.75}>
      <View style={[qaStyles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[qaStyles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  chip: { flex: 1, alignItems: 'center', gap: 5 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 10, fontFamily: 'Oswald_600SemiBold', letterSpacing: 0.3 },
});

function StakeholderEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={seStyles.container}>
      <View style={seStyles.avatarRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              seStyles.ghostAvatar,
              { opacity: 1 - i * 0.25, marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i },
            ]}
          >
            <Ionicons name="person-outline" size={18} color="#C4B49A" />
          </View>
        ))}
      </View>
      <Text style={seStyles.title}>No stakeholders yet</Text>
      <Text style={seStyles.sub}>Add key contacts for this engagement</Text>
      <TouchableOpacity onPress={onAdd} activeOpacity={0.85}>
        <LinearGradient
          colors={['#C05800', '#A04800']}
          style={seStyles.btn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="person-add-outline" size={15} color="#fff" />
          <Text style={seStyles.btnText}>Add First Stakeholder</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const seStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 10 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ghostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F0E8',
    borderWidth: 2,
    borderColor: '#E8DCC0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontFamily: 'Oswald_600SemiBold', color: '#6B5540' },
  sub: { fontSize: 12, fontFamily: 'Oswald_400Regular', color: '#A89070', textAlign: 'center', lineHeight: 17 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  btnText: { fontSize: 13, fontFamily: 'Oswald_600SemiBold', color: '#fff', letterSpacing: 0.3 },
});

// ── Main component ─────────────────────────────────────────────────────────────

type Props = {
  token: string;
  clientId: number;
};

export default function ClientDetailScreen({ token, clientId }: Props) {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const [client, setClient] = useState<Client | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [baseLocation, setBaseLocation] = useState<string | null>(null);

  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [shName, setShName] = useState('');
  const [shRole, setShRole] = useState('');
  const [shEmail, setShEmail] = useState('');
  const [shPhone, setShPhone] = useState('');
  const [shNotes, setShNotes] = useState('');
  const [shSubmitting, setShSubmitting] = useState(false);
  const [shError, setShError] = useState('');

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [vOfficeLabel, setVOfficeLabel] = useState('');
  const [vOfficeAddress, setVOfficeAddress] = useState('');
  const [vDate, setVDate] = useState(new Date());
  const [vShowDatePicker, setVShowDatePicker] = useState(false);
  const [vShowTimePicker, setVShowTimePicker] = useState(false);
  const [vWebDateText, setVWebDateText] = useState('');
  const [vStartLocation, setVStartLocation] = useState('');
  const [vCustomStart, setVCustomStart] = useState('');
  const [vNotes, setVNotes] = useState('');
  const [vSubmitting, setVSubmitting] = useState(false);
  const [vError, setVError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [clientData, stakeholderData, visitsData] = await Promise.all([
        getClient(token, clientId),
        getStakeholders(token, clientId),
        getVisits(token, clientId),
      ]);
      setClient(clientData.client);
      setStakeholders(stakeholderData.stakeholders);
      setVisits(visitsData.visits);
    } catch {} finally {
      setLoading(false);
    }
  }, [token, clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    getLocationProfiles(token).then(({ profiles }) => {
      const base = profiles.find((p) => p.type === 'base');
      if (base) setBaseLocation(base.name);
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLat(pos.coords.latitude);
              setUserLng(pos.coords.longitude);
            },
            () => {},
            { enableHighAccuracy: false, timeout: 8000 }
          );
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLat(loc.coords.latitude);
          setUserLng(loc.coords.longitude);
        }
      } catch {}
    })();
  }, []);

  const resetForm = () => {
    setShName('');
    setShRole('');
    setShEmail('');
    setShPhone('');
    setShNotes('');
    setShError('');
  };

  const openForm = () => {
    resetForm();
    setShowStakeholderForm(true);
  };

  const handleCreateStakeholder = async () => {
    if (!shName.trim()) {
      setShError('Contact name is required');
      return;
    }
    setShSubmitting(true);
    setShError('');
    try {
      await createStakeholder(token, clientId, {
        contact_name: shName.trim(),
        designation_role: shRole.trim() || undefined,
        email: shEmail.trim() || undefined,
        phone: shPhone.trim() || undefined,
        notes: shNotes.trim() || undefined,
      });
      await loadData();
      setShowStakeholderForm(false);
      resetForm();
    } catch (err: any) {
      setShError(err.message || 'Failed to add stakeholder');
    } finally {
      setShSubmitting(false);
    }
  };

  const handleDeleteStakeholder = async (id: number) => {
    try {
      await deleteStakeholder(token, clientId, id);
      await loadData();
    } catch {}
  };

  const resetVisitForm = () => {
    setVOfficeLabel('');
    setVOfficeAddress('');
    setVDate(new Date());
    setVShowDatePicker(false);
    setVShowTimePicker(false);
    setVWebDateText('');
    setVStartLocation('');
    setVCustomStart('');
    setVNotes('');
    setVError('');
  };

  const openVisitForm = () => {
    resetVisitForm();
    setShowVisitForm(true);
  };

  const handleCreateVisit = async () => {
    if (!vOfficeLabel) {
      setVError('Please select a destination office');
      return;
    }
    const startLoc = vStartLocation === 'custom' ? vCustomStart.trim() : (baseLocation || 'Base');
    if (vStartLocation === 'custom' && !vCustomStart.trim()) {
      setVError('Please enter a start location');
      return;
    }
    if (!vStartLocation) {
      setVError('Please select a start location');
      return;
    }

    let plannedAt: string;
    if (Platform.OS === 'web') {
      if (!vWebDateText.trim()) {
        setVError('Please enter a date/time');
        return;
      }
      const parsed = new Date(vWebDateText.trim());
      if (isNaN(parsed.getTime())) {
        setVError('Invalid date format. Use YYYY-MM-DD HH:MM');
        return;
      }
      plannedAt = parsed.toISOString();
    } else {
      plannedAt = vDate.toISOString();
    }

    setVSubmitting(true);
    setVError('');
    try {
      await createVisit(token, clientId, {
        office_label: vOfficeLabel,
        office_address: vOfficeAddress || undefined,
        planned_at: plannedAt,
        start_location: startLoc,
        notes: vNotes.trim() || undefined,
      });
      await loadData();
      setShowVisitForm(false);
      resetVisitForm();
    } catch (err: any) {
      setVError(err.message || 'Failed to log visit');
    } finally {
      setVSubmitting(false);
    }
  };

  const handleDeleteVisit = async (id: number) => {
    try {
      await deleteVisit(token, clientId, id);
      await loadData();
    } catch {}
  };

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C05800" />
        </View>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Client not found</Text>
        </View>
      </View>
    );
  }

  const hColor = HEALTH_COLOR[client.engagement_health] || '#F59E0B';
  const hasPin = client.office_latitude !== null && client.office_longitude !== null;
  const hasUser = userLat !== null && userLng !== null;

  let distLabel = '';
  let driveMin = 0;
  let localTime = '';

  if (hasPin) {
    localTime = estimateLocalTime(client.office_longitude!);
    if (hasUser) {
      const distKm = haversineKm(userLat!, userLng!, client.office_latitude!, client.office_longitude!);
      distLabel = formatDistance(distKm);
      driveMin = driveMinutes(distKm);
    }
  }

  const officeName = client.primary_office_location || client.client_name;

  const navigateToOffice = () => {
    if (!hasPin) return;
    if (Platform.OS === 'ios') {
      openAppleMaps(client.office_latitude!, client.office_longitude!, officeName);
    } else {
      openGoogleMaps(client.office_latitude!, client.office_longitude!, officeName);
    }
  };

  const hasCompanyIntel =
    !!client.company_size || !!client.headquarters_location || !!client.website_domain;

  return (
    <View style={styles.container}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{client.client_name}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {client.client_code}
            {client.industry_sector ? ` · ${client.industry_sector}` : ''}
          </Text>
        </View>
        <View style={[styles.healthPill, { backgroundColor: `${hColor}18`, borderColor: `${hColor}45` }]}>
          <View style={[styles.healthPillDot, { backgroundColor: hColor }]} />
          <Text style={[styles.healthPillText, { color: hColor }]}>{client.engagement_health}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Map Card ─────────────────────────────────────────────────────── */}
        {hasPin ? (
          <View style={styles.mapCard}>
            <View style={styles.mapHero}>
              <ClientLocationMap
                clientLat={client.office_latitude!}
                clientLng={client.office_longitude!}
                userLat={userLat}
                userLng={userLng}
                style={{ flex: 1 }}
              />
              <View style={styles.mapLegend} pointerEvents="none">
                {hasUser && (
                  <View style={styles.legendBadge}>
                    <View style={styles.legendDotGreen} />
                    <Text style={styles.legendText}>You</Text>
                  </View>
                )}
                <View style={[styles.legendBadge, styles.legendOrange]}>
                  <Ionicons name="location" size={10} color="#C05800" />
                  <Text style={[styles.legendText, { color: '#C05800' }]}>Office</Text>
                </View>
              </View>
            </View>

            {/* Live Context Bar */}
            <View style={styles.contextBar}>
              <View style={styles.contextCell}>
                <Text style={styles.contextValue}>{hasUser ? distLabel : '—'}</Text>
                <Text style={styles.contextLabel}>DISTANCE</Text>
              </View>
              <View style={styles.contextDivider} />
              <View style={styles.contextCell}>
                <Text style={styles.contextValue}>{hasUser ? formatDriveTime(driveMin) : '—'}</Text>
                <Text style={styles.contextLabel}>DRIVE TIME</Text>
              </View>
              <View style={styles.contextDivider} />
              <View style={styles.contextCell}>
                <Text style={styles.contextValue}>{localTime}</Text>
                <Text style={styles.contextLabel}>LOCAL TIME ~</Text>
              </View>
            </View>

            {/* Address row */}
            {client.primary_office_location ? (
              <View style={styles.addressRow}>
                <View style={styles.addressIcon}>
                  <Ionicons name="business-outline" size={15} color="#C05800" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>PRIMARY OFFICE</Text>
                  <Text style={styles.addressText}>{client.primary_office_location}</Text>
                </View>
                <Text style={styles.coordsText}>
                  {client.office_latitude!.toFixed(4)}°{'\n'}
                  {client.office_longitude!.toFixed(4)}°
                </Text>
              </View>
            ) : null}

            {/* Navigate CTA */}
            <View style={styles.mapActions}>
              <TouchableOpacity style={styles.navBtn} onPress={navigateToOffice} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#C05800', '#A04800']}
                  style={styles.navBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.navBtnText}>Open in Maps</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noPinCard}>
            <View style={styles.noPinIcon}>
              <Ionicons name="location-outline" size={28} color="#C4B49A" />
            </View>
            <Text style={styles.noPinTitle}>No location pinned</Text>
            <Text style={styles.noPinSub}>Edit this engagement to pin the office on the map</Text>
          </View>
        )}

        {/* ── Bento Row: Pulse + DNA ────────────────────────────────────────── */}
        <View style={styles.bentoRow}>

          {/* Engagement Pulse cell */}
          <View style={[styles.bentoCell, { flex: 1 }]}>
            <Text style={styles.cellLabel}>ENGAGEMENT{'\n'}PULSE</Text>
            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <EngagementRing health={client.engagement_health} />
            </View>
            <Text style={[styles.pulseHealthLabel, { color: hColor }]}>
              {client.engagement_health}
            </Text>
          </View>

          {/* Client DNA cell */}
          <View style={[styles.bentoCell, { flex: 1.2 }]}>
            <Text style={styles.cellLabel}>CLIENT DNA</Text>
            <View style={styles.dnaList}>

              {/* Code — monospace chip */}
              <View style={styles.dnaRow}>
                <Text style={styles.dnaLabel}>Code</Text>
                <View style={styles.dnaCodeChip}>
                  <Text style={[styles.dnaCodeText, { fontFamily: MONOSPACE_FONT as string }]}>
                    {client.client_code}
                  </Text>
                </View>
              </View>

              {/* Tier — premium badge */}
              <View style={styles.dnaRow}>
                <Text style={styles.dnaLabel}>Tier</Text>
                <TierBadge tier={client.client_tier} />
              </View>

              {/* Status — pulsing dot */}
              <View style={styles.dnaRow}>
                <Text style={styles.dnaLabel}>Status</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <PulsingDot color={client.is_active ? '#22C55E' : '#9CA3AF'} />
                  <Text style={[styles.dnaStatusText, { color: client.is_active ? '#22C55E' : '#9CA3AF' }]}>
                    {client.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* Added by — avatar chip */}
              {client.creator_name ? (
                <View style={styles.dnaRow}>
                  <Text style={styles.dnaLabel}>By</Text>
                  <CreatorChip name={client.creator_name} />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Company Intel (optional fields) ──────────────────────────────── */}
        {hasCompanyIntel && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionLabel}>COMPANY INTEL</Text>
            {client.company_size ? (
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={14} color="#A89070" />
                <Text style={styles.detailKey}>Size</Text>
                <Text style={styles.detailVal}>{client.company_size}</Text>
              </View>
            ) : null}
            {client.headquarters_location ? (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={14} color="#A89070" />
                <Text style={styles.detailKey}>HQ</Text>
                <Text style={styles.detailVal}>{client.headquarters_location}</Text>
              </View>
            ) : null}
            {client.website_domain ? (
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="globe-outline" size={14} color="#A89070" />
                <Text style={styles.detailKey}>Web</Text>
                <Text style={[styles.detailVal, { color: '#C05800' }]}>{client.website_domain}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Stakeholders ──────────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>STAKEHOLDERS</Text>
            {stakeholders.length > 0 && (
              <TouchableOpacity style={styles.addChip} onPress={openForm}>
                <Ionicons name="add" size={12} color="#C05800" />
                <Text style={styles.addChipText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {stakeholders.length === 0 ? (
            <StakeholderEmptyState onAdd={openForm} />
          ) : (
            <View style={{ gap: 8 }}>
              {stakeholders.map((s) => (
                <View key={s.id} style={styles.stakeholderCard}>
                  <View style={styles.shAvatarWrap}>
                    <Text style={styles.shAvatar}>
                      {s.contact_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shName}>{s.contact_name}</Text>
                    {s.designation_role ? (
                      <Text style={styles.shRole}>{s.designation_role}</Text>
                    ) : null}
                    {s.email ? (
                      <View style={styles.contactRow}>
                        <Ionicons name="mail-outline" size={11} color="#A89070" />
                        <Text style={styles.contactText}>{s.email}</Text>
                      </View>
                    ) : null}
                    {s.phone ? (
                      <View style={styles.contactRow}>
                        <Ionicons name="call-outline" size={11} color="#A89070" />
                        <Text style={styles.contactText}>{s.phone}</Text>
                      </View>
                    ) : null}
                    {s.notes ? <Text style={styles.shNotes}>{s.notes}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteStakeholder(s.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={13} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Visit History ─────────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>VISIT HISTORY</Text>
            {visits.length > 0 && (
              <TouchableOpacity style={styles.addChip} onPress={openVisitForm}>
                <Ionicons name="add" size={12} color="#C05800" />
                <Text style={styles.addChipText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {visits.length === 0 ? (
            <View style={seStyles.container}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#E8DCC0', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="calendar-outline" size={26} color="#C4B49A" />
              </View>
              <Text style={seStyles.title}>No visits logged yet</Text>
              <Text style={seStyles.sub}>Log a planned visit to this client</Text>
              <TouchableOpacity onPress={openVisitForm} activeOpacity={0.85}>
                <LinearGradient colors={['#C05800', '#A04800']} style={seStyles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="calendar-outline" size={15} color="#fff" />
                  <Text style={seStyles.btnText}>Log First Visit</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {visits.map((v) => {
                const dt = new Date(v.planned_at);
                const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                return (
                  <View key={v.id} style={styles.visitCard}>
                    <View style={styles.visitDateBadge}>
                      <Text style={styles.visitDateDay}>{dt.getDate()}</Text>
                      <Text style={styles.visitDateMon}>{dt.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitOffice}>{v.office_label}</Text>
                      {v.office_address ? (
                        <Text style={styles.visitAddr} numberOfLines={1}>{v.office_address}</Text>
                      ) : null}
                      <Text style={styles.visitMeta}>
                        <Ionicons name="navigate-outline" size={10} color="#A89070" /> {v.start_location}  ·  {timeStr}
                      </Text>
                      {v.notes ? <Text style={styles.visitNotes}>{v.notes}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteVisit(v.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={13} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Padding for floating quick-action bar */}
        <View style={{ height: 96 }} />
      </ScrollView>

      {/* ── Quick Action Bar ──────────────────────────────────────────────────── */}
      <View style={styles.quickBar}>
        <QuickAction icon="call-outline" label="Call" color="#22C55E" onPress={() => {}} />
        <QuickAction icon="navigate-outline" label="Navigate" color="#C05800" onPress={navigateToOffice} />
        <QuickAction icon="journal-outline" label="Log Visit" color="#6B5540" onPress={openVisitForm} />
        <QuickAction icon="share-social-outline" label="Share" color="#A89070" onPress={() => {}} />
      </View>

      {/* ── Add Visit Modal ───────────────────────────────────────────────────── */}
      <Modal visible={showVisitForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Visit</Text>
              <TouchableOpacity onPress={() => setShowVisitForm(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#6B5540" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

              {/* DESTINATION */}
              <Text style={miStyles.label}>DESTINATION</Text>
              {(() => {
                const officeOptions: { label: string; address: string }[] = [];
                if (client?.primary_office_location) officeOptions.push({ label: 'Primary Office', address: client.primary_office_location });
                if (client?.headquarters_location) officeOptions.push({ label: 'HQ', address: client.headquarters_location });
                if (officeOptions.length === 0) {
                  return (
                    <View style={{ marginBottom: 16 }}>
                      <ModalInput label="" value={vOfficeLabel} onChangeText={(t) => { setVOfficeLabel(t); setVOfficeAddress(''); }} placeholder="Office name" />
                    </View>
                  );
                }
                return (
                  <View style={[styles.pillRow, { marginBottom: 16 }]}>
                    {officeOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        style={[styles.pill, vOfficeLabel === opt.label && styles.pillActive]}
                        onPress={() => { setVOfficeLabel(opt.label); setVOfficeAddress(opt.address); }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.pillText, vOfficeLabel === opt.label && styles.pillTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()}

              {/* WHEN */}
              <Text style={[miStyles.label, { marginBottom: 8 }]}>WHEN</Text>
              {Platform.OS === 'web' ? (
                <View style={{ marginBottom: 16 }}>
                  <TextInput
                    style={miStyles.input}
                    value={vWebDateText}
                    onChangeText={setVWebDateText}
                    placeholder="YYYY-MM-DD HH:MM"
                    placeholderTextColor="#B0A898"
                  />
                </View>
              ) : (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TouchableOpacity style={[styles.pill, { flex: 1 }]} onPress={() => { setVShowTimePicker(false); setVShowDatePicker(true); }} activeOpacity={0.75}>
                      <Ionicons name="calendar-outline" size={13} color="#6B5540" />
                      <Text style={styles.pillText}>Pick Date</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.pill, { flex: 1 }]} onPress={() => { setVShowDatePicker(false); setVShowTimePicker(true); }} activeOpacity={0.75}>
                      <Ionicons name="time-outline" size={13} color="#6B5540" />
                      <Text style={styles.pillText}>Pick Time</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: 'Oswald_500Medium', color: '#1a1a1a' }}>
                    {vDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                  {vShowDatePicker && DateTimePicker && (
                    <DateTimePicker
                      value={vDate}
                      mode="date"
                      display="default"
                      onChange={(_: any, selected?: Date) => {
                        setVShowDatePicker(false);
                        if (selected) {
                          const merged = new Date(selected);
                          merged.setHours(vDate.getHours(), vDate.getMinutes());
                          setVDate(merged);
                        }
                      }}
                    />
                  )}
                  {vShowTimePicker && DateTimePicker && (
                    <DateTimePicker
                      value={vDate}
                      mode="time"
                      display="default"
                      onChange={(_: any, selected?: Date) => {
                        setVShowTimePicker(false);
                        if (selected) setVDate(selected);
                      }}
                    />
                  )}
                </View>
              )}

              {/* STARTING FROM */}
              <Text style={[miStyles.label, { marginBottom: 8 }]}>STARTING FROM</Text>
              <View style={[styles.pillRow, { marginBottom: vStartLocation === 'custom' ? 8 : 16 }]}>
                <TouchableOpacity
                  style={[styles.pill, { flex: 1 }, vStartLocation === 'base' && styles.pillActive]}
                  onPress={() => setVStartLocation('base')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="home-outline" size={13} color={vStartLocation === 'base' ? '#C05800' : '#6B5540'} />
                  <Text style={[styles.pillText, vStartLocation === 'base' && styles.pillTextActive]}>
                    {baseLocation || 'Base'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, { flex: 1 }, vStartLocation === 'custom' && styles.pillActive]}
                  onPress={() => setVStartLocation('custom')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="create-outline" size={13} color={vStartLocation === 'custom' ? '#C05800' : '#6B5540'} />
                  <Text style={[styles.pillText, vStartLocation === 'custom' && styles.pillTextActive]}>Custom</Text>
                </TouchableOpacity>
              </View>
              {vStartLocation === 'custom' && (
                <View style={{ marginBottom: 16 }}>
                  <TextInput
                    style={miStyles.input}
                    value={vCustomStart}
                    onChangeText={setVCustomStart}
                    placeholder="e.g. Home, Airport, Hotel..."
                    placeholderTextColor="#B0A898"
                  />
                </View>
              )}

              {/* NOTES */}
              <ModalInput label="Notes (optional)" value={vNotes} onChangeText={setVNotes} placeholder="Any notes about this visit" multiline />

              {vError ? <Text style={styles.formError}>{vError}</Text> : null}
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateVisit} disabled={vSubmitting}>
                <LinearGradient colors={['#C05800', '#A04800']} style={styles.submitGrad}>
                  {vSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="calendar-outline" size={16} color="#fff" />
                      <Text style={styles.submitText}>Log Visit</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Stakeholder Modal ─────────────────────────────────────────────── */}
      <Modal visible={showStakeholderForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Stakeholder</Text>
              <TouchableOpacity
                onPress={() => setShowStakeholderForm(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#6B5540" />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <ModalInput label="Contact Name *" value={shName} onChangeText={setShName} placeholder="Full name" />
              <ModalInput label="Designation / Role" value={shRole} onChangeText={setShRole} placeholder="e.g. VP Engineering" />
              <ModalInput label="Email" value={shEmail} onChangeText={setShEmail} placeholder="email@company.com" keyboardType="email-address" autoCapitalize="none" />
              <ModalInput label="Phone" value={shPhone} onChangeText={setShPhone} placeholder="+1 555-0100" keyboardType="phone-pad" />
              <ModalInput label="Notes" value={shNotes} onChangeText={setShNotes} placeholder="Any relevant notes" multiline />
              {shError ? <Text style={styles.formError}>{shError}</Text> : null}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateStakeholder}
                disabled={shSubmitting}
              >
                <LinearGradient colors={['#C05800', '#A04800']} style={styles.submitGrad}>
                  {shSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={16} color="#fff" />
                      <Text style={styles.submitText}>Add Stakeholder</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── ModalInput ─────────────────────────────────────────────────────────────────

function ModalInput({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={miStyles.wrapper}>
      <Text style={miStyles.label}>{label.toUpperCase()}</Text>
      <TextInput
        style={[miStyles.input, props.multiline && miStyles.inputMulti]}
        placeholderTextColor="#B0A898"
        textAlignVertical={props.multiline ? 'top' : 'auto'}
        {...props}
      />
    </View>
  );
}

const miStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 10,
    fontFamily: 'Oswald_600SemiBold',
    color: '#A89070',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: '#EDE8DF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#1a1a1a',
  },
  inputMulti: { minHeight: 80 },
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBD4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, fontFamily: 'Oswald_500Medium', color: '#6B5540' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FDFBD4',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DCC0',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Oswald_700Bold', color: '#1a1a1a', letterSpacing: 0.3 },
  headerSub: { fontSize: 11, fontFamily: 'Oswald_400Regular', color: '#A89070', marginTop: 1 },
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  healthPillDot: { width: 6, height: 6, borderRadius: 3 },
  healthPillText: { fontSize: 11, fontFamily: 'Oswald_600SemiBold', letterSpacing: 0.3 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Map card
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  mapHero: { height: 220, position: 'relative' },
  mapLegend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  } as any,
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  legendOrange: { borderColor: 'rgba(192,88,0,0.25)' },
  legendDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  legendText: { fontSize: 10, fontFamily: 'Oswald_600SemiBold', color: '#6B5540' },

  // Live Context Bar
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE6',
  },
  contextCell: { flex: 1, alignItems: 'center' },
  contextValue: {
    fontSize: 15,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    letterSpacing: 0.2,
  },
  contextLabel: {
    fontSize: 8,
    fontFamily: 'Oswald_500Medium',
    color: '#A89070',
    marginTop: 2,
    letterSpacing: 0.6,
  },
  contextDivider: { width: 1, height: 32, backgroundColor: '#E8DCC0' },

  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE6',
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(192,88,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  addressLabel: {
    fontSize: 8,
    fontFamily: 'Oswald_700Bold',
    color: '#A89070',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  addressText: { fontSize: 13, fontFamily: 'Oswald_500Medium', color: '#1a1a1a', lineHeight: 18 },
  coordsText: {
    fontSize: 9,
    fontFamily: 'Oswald_400Regular',
    color: '#C4B49A',
    textAlign: 'right',
    lineHeight: 13,
  },

  // Navigate CTA
  mapActions: { padding: 14 },
  navBtn: { borderRadius: 12, overflow: 'hidden' },
  navBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 7,
  },
  navBtnText: { fontSize: 14, fontFamily: 'Oswald_600SemiBold', color: '#fff', letterSpacing: 0.4 },

  // No pin state
  noPinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  noPinIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F5F4EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  noPinTitle: { fontSize: 15, fontFamily: 'Oswald_600SemiBold', color: '#A89070' },
  noPinSub: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#C4B49A',
    textAlign: 'center',
    lineHeight: 17,
  },

  // Bento grid
  bentoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  bentoCell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    padding: 16,
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cellLabel: {
    fontSize: 9,
    fontFamily: 'Oswald_700Bold',
    color: '#A89070',
    letterSpacing: 1.5,
    lineHeight: 13,
  },
  pulseHealthLabel: {
    fontSize: 13,
    fontFamily: 'Oswald_600SemiBold',
    textAlign: 'center',
    marginTop: 10,
  },

  // DNA
  dnaList: { marginTop: 12, gap: 10 },
  dnaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dnaLabel: { fontSize: 10, fontFamily: 'Oswald_500Medium', color: '#A89070' },
  dnaCodeChip: {
    backgroundColor: '#F5F4EF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  dnaCodeText: { fontSize: 12, color: '#1a1a1a' },
  dnaStatusText: { fontSize: 12, fontFamily: 'Oswald_600SemiBold' },

  // Company Intel
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F4EF',
  },
  detailKey: { fontSize: 11, fontFamily: 'Oswald_500Medium', color: '#A89070', width: 28 },
  detailVal: { fontSize: 13, fontFamily: 'Oswald_500Medium', color: '#1a1a1a', flex: 1 },

  // Section card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 9, fontFamily: 'Oswald_700Bold', color: '#A89070', letterSpacing: 1.5 },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(192,88,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,88,0,0.2)',
  },
  addChipText: { fontSize: 11, fontFamily: 'Oswald_600SemiBold', color: '#C05800' },

  // Stakeholder card
  stakeholderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#FDFBD4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  shAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(192,88,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shAvatar: { fontSize: 13, fontFamily: 'Oswald_700Bold', color: '#C05800' },
  shName: { fontSize: 14, fontFamily: 'Oswald_600SemiBold', color: '#1a1a1a' },
  shRole: { fontSize: 11, fontFamily: 'Oswald_400Regular', color: '#C05800', marginTop: 1 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  contactText: { fontSize: 11, fontFamily: 'Oswald_400Regular', color: '#6B5540' },
  shNotes: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    marginTop: 5,
    fontStyle: 'italic',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Visit cards
  visitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#FDFBD4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  visitDateBadge: {
    width: 40,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(192,88,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,88,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  visitDateDay: { fontSize: 17, fontFamily: 'Oswald_700Bold', color: '#C05800', lineHeight: 20 },
  visitDateMon: { fontSize: 8, fontFamily: 'Oswald_600SemiBold', color: '#C05800', letterSpacing: 0.5 },
  visitOffice: { fontSize: 14, fontFamily: 'Oswald_600SemiBold', color: '#1a1a1a' },
  visitAddr: { fontSize: 11, fontFamily: 'Oswald_400Regular', color: '#6B5540', marginTop: 1 },
  visitMeta: { fontSize: 11, fontFamily: 'Oswald_400Regular', color: '#A89070', marginTop: 4 },
  visitNotes: { fontSize: 11, fontFamily: 'Oswald_400Regular', color: '#A89070', marginTop: 4, fontStyle: 'italic' },

  // Pills (office/start selector)
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F4EF',
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  pillActive: {
    backgroundColor: 'rgba(192,88,0,0.1)',
    borderColor: 'rgba(192,88,0,0.35)',
  },
  pillText: { fontSize: 13, fontFamily: 'Oswald_500Medium', color: '#6B5540' },
  pillTextActive: { color: '#C05800', fontFamily: 'Oswald_600SemiBold' },

  // Quick Action Bar
  quickBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(253,251,212,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#E8DCC0',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    paddingHorizontal: 20,
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8DCC0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC0',
  },
  modalTitle: { fontSize: 18, fontFamily: 'Oswald_700Bold', color: '#1a1a1a' },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F4EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  formError: {
    fontSize: 12,
    fontFamily: 'Oswald_500Medium',
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 8,
  },
  submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  submitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  submitText: { fontSize: 15, fontFamily: 'Oswald_600SemiBold', color: '#fff', letterSpacing: 0.4 },
});
