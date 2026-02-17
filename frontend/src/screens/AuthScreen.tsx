import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { login, register } from '../services/api';

const VIDEO_URL = 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-27611-large.mp4';

type AuthScreenProps = {
  onLogin: (user: { id: number; name: string; email: string }, token: string) => void;
};

// Web-specific video component
const VideoBackground = () => {
  if (Platform.OS === 'web') {
    return (
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>
    );
  }

  // For native platforms, use expo-av
  const { Video, ResizeMode } = require('expo-av');
  return (
    <Video
      style={StyleSheet.absoluteFill}
      source={{ uri: VIDEO_URL }}
      resizeMode={ResizeMode.COVER}
      isLooping
      shouldPlay
      isMuted
    />
  );
};

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Video Background */}
      <VideoBackground />

      {/* Dark Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.7)']}
        style={styles.overlay}
      />

      {/* Header with Register/Login Toggle */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <TouchableOpacity style={styles.headerButton} onPress={toggleMode}>
          <Text style={styles.headerButtonText}>
            {isLogin ? 'Register' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.formContainer}>
          {/* Logo */}
          <Text style={styles.logo}>Audient</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Text>

          {/* Card wrapper for form */}
          <View style={styles.formCard}>
            {/* Success Message */}
            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              {!isLogin && (
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {!isLogin && (
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              )}

              {isLogin && (
                <TouchableOpacity style={styles.forgotButton}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
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
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Social Login */}
            <View style={styles.socialSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton}>
                  <Text style={styles.socialIcon}>G</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Text style={styles.socialIcon}>f</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Text style={styles.socialIcon}>{'\u{1D54F}'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  headerLeft: {
    width: 80,
  },
  headerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(61,123,95,0.5)',
    backgroundColor: 'rgba(61,123,95,0.2)',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  logo: {
    fontSize: 56,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 32,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 24,
  },
  successContainer: {
    width: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    color: '#22c55e',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  errorContainer: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1a1a1a',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    color: '#4a5568',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  submitButton: {
    width: '100%',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  socialSection: {
    width: '100%',
    marginTop: 24,
  },
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
    fontFamily: 'Inter_400Regular',
    marginHorizontal: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialIcon: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1a1a1a',
  },
});
