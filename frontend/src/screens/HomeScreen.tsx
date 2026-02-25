import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { getLocationProfiles, LocationProfile } from '../services/api';
import MapViewComponent from '../components/MapView';

type HomeScreenProps = {
  user: { id: number; name: string; email: string; login_count?: number };
  token: string;
  onLogout: () => void;
};

type WeatherData = {
  temp: number;
  code: number;
  windspeed: number;
};

function distMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function weatherIcon(code: number): string {
  if (code === 0) return 'sunny';
  if (code <= 2) return 'cloudy-outline';
  if (code <= 3) return 'cloud';
  if (code <= 48) return 'cloud-outline';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rainy';
  return 'thunderstorm';
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 2) return 'Partly Cloudy';
  if (code <= 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  return 'Thunderstorm';
}

const DEFAULT_CENTER = { latitude: 20.5937, longitude: 78.9629 };

export default function HomeScreen({ user, token }: HomeScreenProps) {
  const navigation = useNavigation<any>();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'live' | 'denied'>('loading');
  const [locations, setLocations] = useState<LocationProfile[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // GPS badge pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // GPS tracking
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsStatus('denied'); return; }
      setGpsStatus('live');
      const last = await Location.getLastKnownPositionAsync();
      if (last) setGps({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 30 },
        (pos) => setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      );
    })();
    return () => { sub?.remove(); };
  }, []);

  // Location profiles
  useEffect(() => {
    getLocationProfiles(token).then((d) => setLocations(d.profiles)).catch(() => {});
  }, [token]);

  // Weather — fetch once on first GPS fix
  const weatherFetched = useRef(false);
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setWeatherLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`
      );
      const data = await res.json();
      setWeather({ temp: data.current.temperature_2m, code: data.current.weathercode, windspeed: data.current.windspeed_10m });
    } catch {}
    setWeatherLoading(false);
  }, []);

  useEffect(() => {
    if (!gps || weatherFetched.current) return;
    weatherFetched.current = true;
    fetchWeather(gps.latitude, gps.longitude);
  }, [gps, fetchWeather]);

  if (!fontsLoaded) return null;

  // Derived state
  const nearbyProfile = gps
    ? locations.find((l) => {
        if (!l.latitude || !l.longitude) return false;
        return distMeters(gps.latitude, gps.longitude, l.latitude, l.longitude) < 300;
      })
    : undefined;

  const locStatus = nearbyProfile
    ? { label: nearbyProfile.name, type: nearbyProfile.type as 'base' | 'client' }
    : { label: 'In the Field', type: 'field' as const };

  const baseProfile = locations.find((l) => l.type === 'base');
  const mapCenter =
    gps ??
    (baseProfile?.latitude && baseProfile?.longitude
      ? { latitude: baseProfile.latitude, longitude: baseProfile.longitude }
      : DEFAULT_CENTER);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.name.split(' ')[0];
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  const topPadding = Platform.OS === 'ios' ? 54 : Platform.OS === 'android' ? 40 : 24;

  // Avatar initials passed to the map marker
  const avatarLabel = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const chipColors = {
    base:   { bg: 'rgba(22,163,74,0.18)',  border: 'rgba(22,163,74,0.4)',  text: '#4ade80', icon: 'home' },
    client: { bg: 'rgba(96,165,250,0.18)', border: 'rgba(96,165,250,0.4)', text: '#93c5fd', icon: 'business' },
    field:  { bg: 'rgba(251,191,36,0.18)', border: 'rgba(251,191,36,0.4)', text: '#fcd34d', icon: 'navigate-circle' },
  } as const;
  const chip = chipColors[locStatus.type];

  return (
    <View style={styles.container}>
      {/* Full-screen 3D map — avatar bubble is rendered inside as a map marker */}
      <View style={StyleSheet.absoluteFill}>
        <MapViewComponent
          latitude={mapCenter.latitude}
          longitude={mapCenter.longitude}
          tilt
          avatarLabel={avatarLabel}
          style={{ borderRadius: 0 }}
        />
      </View>

      {/* Gradient overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={[
            'rgba(4,4,10,0.72)',
            'rgba(4,4,10,0.18)',
            'rgba(4,4,10,0.06)',
            'rgba(4,4,10,0.78)',
          ]}
          locations={[0, 0.2, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPadding }]} pointerEvents="box-none">
        <View style={styles.topBarLeft}>
          {Platform.OS !== 'web' && (
            <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.greeting}>{greeting}, {firstName}!</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
        </View>

        <View style={[styles.gpsBadge, gpsStatus === 'denied' && styles.gpsBadgeDenied]}>
          <Animated.View
            style={[
              styles.gpsDot,
              gpsStatus === 'denied' && styles.gpsDotDenied,
              { opacity: pulseAnim },
            ]}
          />
          <Text style={[styles.gpsBadgeText, gpsStatus === 'denied' && styles.gpsBadgeTextDenied]}>
            {gpsStatus === 'live' ? 'Live' : gpsStatus === 'loading' ? '...' : 'GPS Off'}
          </Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        {/* Location chip */}
        <View style={[styles.locationChip, { backgroundColor: chip.bg, borderColor: chip.border }]}>
          <Ionicons name={chip.icon as any} size={15} color={chip.text} />
          <Text style={[styles.locationChipLabel, { color: chip.text }]}>{locStatus.label}</Text>
          {gps && (
            <Text style={styles.coordsText} numberOfLines={1}>
              {gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}
            </Text>
          )}
        </View>

        {/* Cards row */}
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Ionicons name="checkbox-outline" size={22} color="rgba(255,255,255,0.75)" />
            <Text style={styles.cardValue}>0</Text>
            <Text style={styles.cardLabel}>Tasks Today</Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={[styles.card, styles.cardWide]}>
            {weatherLoading ? (
              <ActivityIndicator color="rgba(255,255,255,0.45)" size="small" />
            ) : weather ? (
              <>
                <View style={styles.weatherTop}>
                  <Ionicons name={weatherIcon(weather.code) as any} size={26} color="#FFFFFF" />
                  <Text style={styles.weatherTemp}>{Math.round(weather.temp)}°C</Text>
                </View>
                <Text style={styles.cardLabel}>{weatherLabel(weather.code)}</Text>
                <View style={styles.weatherWindRow}>
                  <Ionicons name="water-outline" size={11} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.weatherWind}>{Math.round(weather.windspeed)} km/h</Text>
                </View>
              </>
            ) : (
              <Text style={styles.cardLabelMuted}>Weather unavailable</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050a' },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 22, paddingBottom: 16, zIndex: 10,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hamburger: { padding: 4, marginTop: 2 },
  greeting: { fontSize: 24, fontFamily: 'Oswald_700Bold', color: '#FFFFFF', letterSpacing: 0.3 },
  dateText: { fontSize: 13, fontFamily: 'Oswald_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  gpsBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(22,163,74,0.18)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.35)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, gap: 7,
  },
  gpsBadgeDenied: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' },
  gpsDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  gpsDotDenied: { backgroundColor: '#f87171' },
  gpsBadgeText: { fontSize: 12, fontFamily: 'Oswald_500Medium', color: '#4ade80' },
  gpsBadgeTextDenied: { color: '#f87171' },

  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(8,7,6,0.82)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    gap: 14,
    // @ts-ignore web-only
    backdropFilter: 'blur(20px)',
  },

  locationChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, gap: 8,
  },
  locationChipLabel: { fontSize: 14, fontFamily: 'Oswald_600SemiBold' },
  coordsText: { fontSize: 11, fontFamily: 'Oswald_400Regular', color: 'rgba(255,255,255,0.3)', marginLeft: 4 },

  cardsRow: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 16, gap: 4,
  },
  cardWide: { flex: 2 },
  cardDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  cardValue: { fontSize: 32, fontFamily: 'Oswald_700Bold', color: '#FFFFFF', marginTop: 4 },
  cardLabel: { fontSize: 12, fontFamily: 'Oswald_400Regular', color: 'rgba(255,255,255,0.45)' },
  cardLabelMuted: { fontSize: 12, fontFamily: 'Oswald_400Regular', color: 'rgba(255,255,255,0.3)', marginTop: 4 },

  weatherTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  weatherTemp: { fontSize: 32, fontFamily: 'Oswald_700Bold', color: '#FFFFFF' },
  weatherWindRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  weatherWind: { fontSize: 11, fontFamily: 'Oswald_400Regular', color: 'rgba(255,255,255,0.4)' },
});
