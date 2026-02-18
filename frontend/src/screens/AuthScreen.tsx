import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { login, register } from '../services/api';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80';

type AuthScreenProps = {
  onLogin: (user: { id: number; name: string; email: string }, token: string) => void;
};

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const { width } = useWindowDimensions();
  const showImagePanel = width >= 768;

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Location coordinates captured during sign-in flow
  const locationCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (!isLogin) {
      if (!name) {
        setError('Name is required');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (isAdmin) {
        if (!adminSecret) {
          setError('Admin secret key is required');
          return;
        }
        if (!orgName) {
          setError('Organization name is required for admin accounts');
          return;
        }
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Request location permission when the user clicks Sign In
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setError('Location permission is required to sign in');
            setLoading(false);
            return;
          }
          // Try instant cached position first, fall back to fresh fetch
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown) {
            locationCoordsRef.current = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            };
          } else {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
            locationCoordsRef.current = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
          }
        } catch {
          setError('Location permission is required to sign in');
          setLoading(false);
          return;
        }

        const coords = locationCoordsRef.current;
        const res = await login(
          email,
          password,
          coords?.latitude,
          coords?.longitude,
        );
        // Persist session for "Remember me" (work hours only: 9:30 AM – 6:00 PM)
        if (rememberMe) {
          try {
            await SecureStore.setItemAsync('audient_session', JSON.stringify({ user: res.user, token: res.token }));
          } catch {}
        } else {
          try { await SecureStore.deleteItemAsync('audient_session'); } catch {}
        }
        onLogin(res.user, res.token);
      } else {
        await register(
          name,
          email,
          password,
          isAdmin ? 'admin' : 'employee',
          isAdmin ? adminSecret : undefined,
          isAdmin ? orgName : undefined,
        );
        setIsLogin(true);
        setName('');
        setPassword('');
        setConfirmPassword('');
        setIsAdmin(false);
        setAdminSecret('');
        setOrgName('');
        setSuccess('Account created successfully! Please sign in.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (toLogin: boolean) => {
    if (toLogin === isLogin) return;
    setIsLogin(toLogin);
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setIsAdmin(false);
    setAdminSecret('');
    setOrgName('');
    setError('');
    setSuccess('');
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Left Panel — Form */}
      <ScrollView
        style={styles.leftPanel}
        contentContainerStyle={styles.leftContent}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>A</Text>
          </View>
          <Text style={styles.logoText}>Audient</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>
          {isLogin ? 'Welcome Back!' : 'Get Started!'}
        </Text>
        <Text style={styles.subheading}>
          {isLogin ? 'We Are Happy To See You Again' : 'Create your new account'}
        </Text>

        {/* Tab Toggle */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.tabActive]}
            onPress={() => switchMode(true)}
          >
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.tabActive]}
            onPress={() => switchMode(false)}
          >
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            {error.includes('Location') && (
              <Ionicons name="compass-outline" size={20} color="#ef4444" style={{ marginBottom: 4, alignSelf: 'center' }} />
            )}
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        {!isLogin && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          </View>
        )}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Ionicons name="mail-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Ionicons name="eye-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
        </View>

        {!isLogin && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <Ionicons name="shield-checkmark-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
          </View>
        )}

        {/* Admin Toggle (Sign Up only) */}
        {!isLogin && (
          <TouchableOpacity
            style={styles.adminToggleRow}
            onPress={() => setIsAdmin(!isAdmin)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isAdmin && styles.checkboxCheckedAdmin]}>
              {isAdmin && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.adminToggleText}>Register as Admin</Text>
            <Ionicons name="shield" size={16} color={isAdmin ? '#C05800' : '#9ca3af'} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}

        {/* Admin fields */}
        {!isLogin && isAdmin && (
          <>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Organization name"
                placeholderTextColor="#9ca3af"
                value={orgName}
                onChangeText={setOrgName}
                autoCapitalize="words"
              />
              <Ionicons name="business-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Admin secret key"
                placeholderTextColor="#9ca3af"
                value={adminSecret}
                onChangeText={setAdminSecret}
                secureTextEntry
              />
              <Ionicons name="key-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
            </View>
          </>
        )}

        {/* Remember me + Forgot Password */}
        {isLogin && (
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#3d7b5f', '#4a9d7a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {isLogin ? 'Login' : 'Create Account'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons */}
        <TouchableOpacity style={styles.appleButton}>
          <Ionicons name="logo-apple" size={20} color="#fff" />
          <Text style={styles.appleButtonText}>Log in with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleButton}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleButtonText}>Log in with Google</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Right Panel — Hero Image (wide screens only) */}
      {showImagePanel && (
        <View style={styles.rightPanel}>
          <Image
            source={{ uri: HERO_IMAGE }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },

  // Left Panel
  leftPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  leftContent: {
    paddingHorizontal: 48,
    paddingVertical: 48,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3d7b5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoIconText: {
    fontSize: 18,
    fontFamily: 'Oswald_700Bold',
    color: '#ffffff',
  },
  logoText: {
    fontSize: 22,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },

  // Heading
  heading: {
    fontSize: 28,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    marginBottom: 28,
  },

  // Tab Toggle
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3d7b5f',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Oswald_500Medium',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#ffffff',
  },

  // Messages
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    color: '#22c55e',
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    textAlign: 'center',
  },

  // Inputs
  inputWrapper: {
    position: 'relative' as const,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#f5f5f0',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingRight: 48,
    fontSize: 15,
    fontFamily: 'Oswald_400Regular',
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputIcon: {
    position: 'absolute' as const,
    right: 16,
    top: 17,
  },

  // Options Row
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#3d7b5f',
    backgroundColor: 'transparent',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3d7b5f',
  },
  checkboxCheckedAdmin: {
    backgroundColor: '#C05800',
    borderColor: '#C05800',
  },
  adminToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -4,
  },
  adminToggleText: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#4a5568',
  },
  rememberText: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
  },
  forgotText: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#3d7b5f',
  },

  // Submit
  submitButton: {
    width: '100%',
    marginBottom: 24,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    color: '#9ca3af',
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    marginHorizontal: 16,
  },

  // Social Buttons
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    marginBottom: 12,
    gap: 10,
  },
  appleButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Oswald_500Medium',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontFamily: 'Oswald_600SemiBold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontFamily: 'Oswald_500Medium',
  },

  // Right Panel
  rightPanel: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  heroImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
