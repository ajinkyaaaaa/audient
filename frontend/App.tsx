import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import AuthScreen from './src/screens/AuthScreen';
import AppNavigator from './src/navigation/AppNavigator';

type User = {
  id: number;
  name: string;
  email: string;
  login_count?: number;
  role?: string;
  organization_id?: number;
};

function isWithinWorkHours(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = hours * 60 + minutes; // minutes since midnight
  const start = 9 * 60 + 30;  // 9:30 AM
  const end = 18 * 60;         // 6:00 PM
  return time >= start && time <= end;
}

const SESSION_KEY = 'audient_session';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Restore saved session if within work hours (9:30 AM – 6:00 PM)
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(SESSION_KEY);
        if (saved && isWithinWorkHours()) {
          const { user: savedUser, token: savedToken } = JSON.parse(saved);
          if (savedUser && savedToken) {
            setUser(savedUser);
            setToken(savedToken);
          }
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const handleLogin = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = async () => {
    setUser(null);
    setToken(null);
    try { await SecureStore.deleteItemAsync(SESSION_KEY); } catch {}
  };

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {user && token ? (
        <AppNavigator user={user} token={token} onLogout={handleLogout} />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </GestureHandlerRootView>
  );
}
