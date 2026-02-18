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
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { getRecording, deleteRecording, Recording } from '../services/api';

type Props = {
  token: string;
  recordingId: number;
};

export default function RecordingDetailScreen({ token, recordingId }: Props) {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({ Oswald_400Regular, Oswald_500Medium, Oswald_600SemiBold, Oswald_700Bold });
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try { const data = await getRecording(token, recordingId); setRecording(data.recording); }
    catch {} finally { setLoading(false); }
  }, [token, recordingId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await deleteRecording(token, recordingId); navigation.goBack(); }
    catch { setDeleting(false); }
  };

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!fontsLoaded) return null;

  if (loading) return <View style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color="#3d7b5f" /></View></View>;
  if (!recording) return <View style={styles.container}><View style={styles.centered}><Text style={styles.emptyText}>Recording not found</Text></View></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recording</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={styles.infoCard}>
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}><Ionicons name="mic" size={24} color="#3d7b5f" /></View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{fmt(recording.duration_seconds || 0)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Recorded</Text>
            <Text style={styles.infoValue}>{fmtDate(recording.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#DC2626" /> : <Text style={styles.deleteButtonText}>Delete Recording</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontFamily: 'Oswald_500Medium', color: '#4a5568' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24, paddingHorizontal: 24, paddingBottom: 16 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Oswald_700Bold', color: '#1a1a1a' },
  infoCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 20, marginBottom: 24 },
  iconRow: { alignItems: 'center', marginBottom: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(61,123,95,0.1)', justifyContent: 'center', alignItems: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f0' },
  infoLabel: { fontSize: 13, fontFamily: 'Oswald_500Medium', color: '#9ca3af' },
  infoValue: { fontSize: 14, fontFamily: 'Oswald_600SemiBold', color: '#1a1a1a', flex: 1, textAlign: 'right' },
  deleteButton: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', backgroundColor: 'rgba(220,38,38,0.08)', alignItems: 'center' },
  deleteButtonText: { fontSize: 15, fontFamily: 'Oswald_500Medium', color: '#DC2626' },
});
