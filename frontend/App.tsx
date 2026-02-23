import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AuthScreen from './src/screens/AuthScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { OrgConfig, syncLocation } from './src/services/api';

// ── Background location task ─────────────────────────────────────────────────
// Must be defined at module level, before any component renders.
const LOCATION_TASK = 'audient-location-sync';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;
  const loc = locations[locations.length - 1];
  try {
    const session = await SecureStore.getItemAsync('audient_session');
    if (!session) return;
    const { token } = JSON.parse(session);
    if (!token) return;
    await syncLocation(token, loc.coords.latitude, loc.coords.longitude);
  } catch {}
});

type User = {
  id: number;
  name: string;
  email: string;
  login_count?: number;
  role?: string;
  organization_id?: number;
};

const SESSION_KEY = 'audient_session';
const ORG_CONFIG_KEY = 'audient_org_config';
const PERIOD_KEY = 'audient_period';

const DEFAULT_ORG_CONFIG: OrgConfig = {
  login_time: '09:00',
  logoff_time: '18:00',
  timezone: 'Asia/Kolkata',
};

function isWithinWorkHours(config: OrgConfig): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = hours * 60 + minutes;
  const [startH, startM] = config.login_time.split(':').map(Number);
  const [endH, endM] = config.logoff_time.split(':').map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  return time >= start && time <= end;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [orgConfig, setOrgConfig] = useState<OrgConfig>(DEFAULT_ORG_CONFIG);
  const [period, setPeriod] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const forceLogoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationPingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore saved session if within work hours
  useEffect(() => {
    (async () => {
      try {
        // Load cached org config first
        const savedConfig = await SecureStore.getItemAsync(ORG_CONFIG_KEY);
        const cachedConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_ORG_CONFIG;
        setOrgConfig(cachedConfig);

        const saved = await SecureStore.getItemAsync(SESSION_KEY);
        if (saved) {
          const { user: savedUser, token: savedToken, rememberMe: savedRememberMe } = JSON.parse(saved);
          // Restore session if: remember me was checked (bypass work hours) OR currently within work hours
          if (savedUser && savedToken && (savedRememberMe || isWithinWorkHours(cachedConfig))) {
            setUser(savedUser);
            setToken(savedToken);
          }
        }

        const savedPeriod = await SecureStore.getItemAsync(PERIOD_KEY);
        if (savedPeriod) setPeriod(savedPeriod);
      } catch {}
      setReady(true);
    })();
  }, []);

  const handleLogout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setPeriod(null);
    try { await SecureStore.deleteItemAsync(SESSION_KEY); } catch {}
    try { await SecureStore.deleteItemAsync(PERIOD_KEY); } catch {}
  }, []);

  // Force-logout timer: check every 30s if we crossed login_time while period was "Morning"
  useEffect(() => {
    if (!user || !token) {
      if (forceLogoutRef.current) {
        clearInterval(forceLogoutRef.current);
        forceLogoutRef.current = null;
      }
      return;
    }

    forceLogoutRef.current = setInterval(async () => {
      const savedPeriod = await SecureStore.getItemAsync(PERIOD_KEY);
      if (savedPeriod === 'Morning' && isWithinWorkHours(orgConfig)) {
        // We've crossed into work hours while session was a Morning login
        Alert.alert(
          'Work Hours Started',
          'Please re-login to begin your day and capture your location.',
          [{ text: 'OK', onPress: handleLogout }],
        );
      }
    }, 30000);

    return () => {
      if (forceLogoutRef.current) {
        clearInterval(forceLogoutRef.current);
        forceLogoutRef.current = null;
      }
    };
  }, [user, token, orgConfig, handleLogout]);

  // Location sync: background task when permission granted, foreground interval as fallback
  useEffect(() => {
    if (!user || !token) {
      // Stop background task and foreground interval on logout
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)
        .then(started => { if (started) Location.stopLocationUpdatesAsync(LOCATION_TASK); })
        .catch(() => {});
      if (locationPingRef.current) {
        clearInterval(locationPingRef.current);
        locationPingRef.current = null;
      }
      return;
    }

    const intervalMs = (orgConfig.location_sync_interval ?? 5) * 1000;
    const tokenSnapshot = token;

    (async () => {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') return;

      const { status: bgStatus } = Platform.OS !== 'web'
        ? await Location.requestBackgroundPermissionsAsync()
        : { status: 'denied' as const };

      if (bgStatus === 'granted' && Platform.OS !== 'web') {
        // Full background tracking via task manager
        try {
          const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
          if (alreadyRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
          await Location.startLocationUpdatesAsync(LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: intervalMs,
            distanceInterval: 0,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'Audient',
              notificationBody: 'Location sync is active',
              notificationColor: '#3d7b5f',
            },
          });
        } catch {}
      } else {
        // Fallback: foreground-only interval
        const ping = async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            await syncLocation(tokenSnapshot, loc.coords.latitude, loc.coords.longitude);
          } catch {}
        };
        ping();
        locationPingRef.current = setInterval(ping, intervalMs);
      }
    })();

    return () => {
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)
        .then(started => { if (started) Location.stopLocationUpdatesAsync(LOCATION_TASK); })
        .catch(() => {});
      if (locationPingRef.current) {
        clearInterval(locationPingRef.current);
        locationPingRef.current = null;
      }
    };
  }, [user, token, orgConfig.location_sync_interval]);

  const handleLogin = async (
    userData: User,
    authToken: string,
    loginOrgConfig?: OrgConfig,
    loginPeriod?: string | null,
  ) => {
    setUser(userData);
    setToken(authToken);

    if (loginOrgConfig) {
      setOrgConfig(loginOrgConfig);
      try {
        await SecureStore.setItemAsync(ORG_CONFIG_KEY, JSON.stringify(loginOrgConfig));
      } catch {}
    }

    if (loginPeriod !== undefined) {
      setPeriod(loginPeriod);
      try {
        if (loginPeriod) {
          await SecureStore.setItemAsync(PERIOD_KEY, loginPeriod);
        } else {
          await SecureStore.deleteItemAsync(PERIOD_KEY);
        }
      } catch {}
    }
  };

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {user && token ? (
        <AppNavigator user={user} token={token} onLogout={handleLogout} orgConfig={orgConfig} />
      ) : (
        <AuthScreen onLogin={handleLogin} orgConfig={orgConfig} />
      )}
    </GestureHandlerRootView>
  );
}
