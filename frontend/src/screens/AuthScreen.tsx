import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(email, password);
        onLogin(res.user, res.token);
      } else {
        await register(name, email, password);
        setIsLogin(true);
        setName('');
        setPassword('');
        setConfirmPassword('');
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

        {/* Remember me + Forgot Password */}
        {isLogin && (
          <View style={styles.optionsRow}>
            <View style={styles.rememberRow}>
              <View style={styles.checkbox} />
              <Text style={styles.rememberText}>Remember me</Text>
            </View>
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
    backgroundColor: '#3d7b5f',
    marginRight: 8,
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
