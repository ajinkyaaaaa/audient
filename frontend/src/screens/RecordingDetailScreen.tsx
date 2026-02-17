import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { getRecording, deleteRecording, Recording } from '../services/api';

type Props = {
  token: string;
  recordingId: number;
};

export default function RecordingDetailScreen({ token, recordingId }: Props) {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getRecording(token, recordingId);
      setRecording(data.recording);
    } catch {} finally {
      setLoading(false);
    }
  }, [token, recordingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRecording(token, recordingId);
      navigation.goBack();
    } catch {
      setDeleting(false);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3d7b5f" />
        </View>
      </View>
    );
  }

  if (!recording) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Recording not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recording</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconRow}>
            <View style={styles.infoIcon}>
              <View style={styles.micBodyLarge} />
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{formatDuration(recording.duration_seconds || 0)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Recorded</Text>
            <Text style={styles.infoValue}>{formatDate(recording.created_at)}</Text>
          </View>
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete Recording</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#4a5568',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  backText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1a1a1a',
  },
  headerRight: {
    width: 36,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(61,123,95,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBodyLarge: {
    width: 16,
    height: 24,
    backgroundColor: '#3d7b5f',
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f0',
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#9ca3af',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },

  // Delete
  deleteButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#ef4444',
  },
});
