import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import AuthScreen from './src/screens/AuthScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { OrgConfig } from './src/services/api';

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

  // Restore saved session if within work hours
  useEffect(() => {
    (async () => {
      try {
        // Load cached org config first
        const savedConfig = await SecureStore.getItemAsync(ORG_CONFIG_KEY);
        const cachedConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_ORG_CONFIG;
        setOrgConfig(cachedConfig);

        const saved = await SecureStore.getItemAsync(SESSION_KEY);
        if (saved && isWithinWorkHours(cachedConfig)) {
          const { user: savedUser, token: savedToken } = JSON.parse(saved);
          if (savedUser && savedToken) {
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
