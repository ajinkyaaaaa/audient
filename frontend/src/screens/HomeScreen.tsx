import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  createRecording,
  getRecordings,
  Recording,
} from '../services/api';
import { HomeStackParamList } from '../navigation/types';

type HomeScreenProps = {
  user: { id: number; name: string; email: string; login_count?: number };
  token: string;
  onLogout: () => void;
};

export default function HomeScreen({ user, token, onLogout }: HomeScreenProps) {
  const drawerNav = useNavigation();
  const stackNav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Recordings list
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const loadRecordings = useCallback(async () => {
    try {
      const data = await getRecordings(token);
      setRecordings(data.recordings);
    } catch {} finally {
      setLoadingRecordings(false);
    }
  }, [token]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;

    setElapsedSeconds(0);
    elapsedRef.current = 0;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
    }, 1000);
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    setIsRecording(false);

    // Auto-save the recording
    try {
      await createRecording(token, { duration_seconds: elapsedRef.current });
      await loadRecordings();
    } catch {}

    setElapsedSeconds(0);
    elapsedRef.current = 0;
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!fontsLoaded) return null;

  const openDrawer = () => drawerNav.dispatch(DrawerActions.openDrawer());

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audient</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Mic Tile */}
        <View style={styles.micSection}>
          <TouchableOpacity
            style={[styles.micTile, isRecording && styles.micTileRecording]}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={isRecording ? ['#ef4444', '#dc2626'] : ['#6366f1', '#8b5cf6']}
              style={styles.micGradient}
            >
              {/* Mic icon using styled views */}
              <View style={styles.micIcon}>
                <View style={styles.micBody} />
                <View style={styles.micBase} />
                <View style={styles.micStand} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording {formatDuration(elapsedSeconds)}</Text>
            </View>
          )}

          {!isRecording && (
            <Text style={styles.micHint}>Tap to start recording</Text>
          )}

          {isRecording && (
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopSquare} />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recordings List */}
        <View style={styles.recordingsSection}>
          <Text style={styles.sectionTitle}>
            Recordings{recordings.length > 0 ? ` (${recordings.length})` : ''}
          </Text>

          {loadingRecordings ? (
            <ActivityIndicator color="#818cf8" style={{ marginTop: 20 }} />
          ) : recordings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recordings yet</Text>
              <Text style={styles.emptySubtext}>Your submitted recordings will appear here</Text>
            </View>
          ) : (
            recordings.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.recordingRow}
                activeOpacity={0.7}
                onPress={() => stackNav.navigate('RecordingDetail', { recordingId: r.id })}
              >
                <View style={styles.recordingLeft}>
                  <View style={styles.recordingIconSmall}>
                    <View style={styles.micBodySmall} />
                  </View>
                  <View style={styles.recordingMeta}>
                    <Text style={styles.recordingTitle} numberOfLines={1}>
                      Recording · {formatDuration(r.duration_seconds || 0)}
                    </Text>
                    <Text style={styles.recordingDate}>
                      {formatDate(r.created_at)} · {formatDuration(r.duration_seconds || 0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.recordingArrow}>
                  <Text style={styles.arrowText}>{'>'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  hamburger: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerBar: {
    width: 22,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
    marginVertical: 2.5,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: 2,
  },
  headerRight: {
    width: 36,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Mic Section
  micSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  micTile: {
    borderRadius: 48,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  micTileRecording: {
    shadowColor: '#ef4444',
  },
  micGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    alignItems: 'center',
  },
  micBody: {
    width: 20,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  micBase: {
    width: 32,
    height: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: '#fff',
    marginTop: -2,
  },
  micStand: {
    width: 2.5,
    height: 6,
    backgroundColor: '#fff',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#ef4444',
  },
  micHint: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#ef4444',
    marginRight: 10,
  },
  stopButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#ef4444',
  },

  // Recordings List
  recordingsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordingIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99,102,241,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  micBodySmall: {
    width: 10,
    height: 16,
    backgroundColor: '#818cf8',
    borderRadius: 5,
  },
  recordingMeta: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    marginBottom: 2,
  },
  recordingDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
  },
  recordingArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  arrowText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
