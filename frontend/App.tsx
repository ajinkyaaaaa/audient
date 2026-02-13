import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AuthScreen from './src/screens/AuthScreen';
import AppNavigator from './src/navigation/AppNavigator';

type User = {
  id: number;
  name: string;
  email: string;
  login_count?: number;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const handleLogin = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <>
      <StatusBar style="light" />
      {user && token ? (
        <AppNavigator user={user} token={token} onLogout={handleLogout} />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </>
  );
}
