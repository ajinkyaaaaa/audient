import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  getClient,
  getStakeholders,
  createStakeholder,
  deleteStakeholder,
  Client,
  Stakeholder,
} from '../services/api';

type Props = {
  token: string;
  clientId: number;
};

const healthColor: Record<string, string> = {
  Good: '#22c55e',
  Neutral: '#f59e0b',
  Risk: '#ef4444',
};

export default function ClientDetailScreen({ token, clientId }: Props) {
  const navigation = useNavigation();
  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const [client, setClient] = useState<Client | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);

  // Stakeholder form
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [shName, setShName] = useState('');
  const [shRole, setShRole] = useState('');
  const [shEmail, setShEmail] = useState('');
  const [shPhone, setShPhone] = useState('');
  const [shNotes, setShNotes] = useState('');
  const [shSubmitting, setShSubmitting] = useState(false);
  const [shError, setShError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [clientData, stakeholderData] = await Promise.all([
        getClient(token, clientId),
        getStakeholders(token, clientId),
      ]);
      setClient(clientData.client);
      setStakeholders(stakeholderData.stakeholders);
    } catch {} finally {
      setLoading(false);
    }
  }, [token, clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetStakeholderForm = () => {
    setShName('');
    setShRole('');
    setShEmail('');
    setShPhone('');
    setShNotes('');
    setShError('');
  };

  const handleCreateStakeholder = async () => {
    if (!shName.trim()) {
      setShError('Contact name is required');
      return;
    }
    setShSubmitting(true);
    setShError('');
    try {
      await createStakeholder(token, clientId, {
        contact_name: shName.trim(),
        designation_role: shRole.trim() || undefined,
        email: shEmail.trim() || undefined,
        phone: shPhone.trim() || undefined,
        notes: shNotes.trim() || undefined,
      });
      await loadData();
      setShowStakeholderForm(false);
      resetStakeholderForm();
    } catch (err: any) {
      setShError(err.message || 'Failed to add stakeholder');
    } finally {
      setShSubmitting(false);
    }
  };

  const handleDeleteStakeholder = async (id: number) => {
    try {
      await deleteStakeholder(token, clientId, id);
      await loadData();
    } catch {}
  };

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C05800" />
        </View>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Client not found</Text>
        </View>
      </View>
    );
  }

  const hColor = healthColor[client.engagement_health] || '#f59e0b';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{client.client_name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Client Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Code</Text>
            <Text style={styles.infoValue}>{client.client_code}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tier</Text>
            <Text style={styles.infoValue}>{client.client_tier}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Health</Text>
            <View style={styles.healthRow}>
              <View style={[styles.healthDot, { backgroundColor: hColor }]} />
              <Text style={[styles.infoValue, { color: hColor }]}>{client.engagement_health}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: client.is_active ? '#22c55e' : '#ef4444' }]}>
              {client.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          {client.industry_sector ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Industry</Text>
              <Text style={styles.infoValue}>{client.industry_sector}</Text>
            </View>
          ) : null}
          {client.company_size ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Size</Text>
              <Text style={styles.infoValue}>{client.company_size}</Text>
            </View>
          ) : null}
          {client.headquarters_location ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>HQ</Text>
              <Text style={styles.infoValue}>{client.headquarters_location}</Text>
            </View>
          ) : null}
          {client.primary_office_location ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Office</Text>
              <Text style={styles.infoValue}>{client.primary_office_location}</Text>
            </View>
          ) : null}
          {client.website_domain ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Website</Text>
              <Text style={styles.infoValue}>{client.website_domain}</Text>
            </View>
          ) : null}
        </View>

        {/* Stakeholders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Stakeholders</Text>
          <TouchableOpacity
            style={styles.addSmallButton}
            onPress={() => { resetStakeholderForm(); setShowStakeholderForm(true); }}
          >
            <Text style={styles.addSmallButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {stakeholders.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No stakeholders added yet</Text>
          </View>
        ) : (
          stakeholders.map((s) => (
            <View key={s.id} style={styles.stakeholderCard}>
              <View style={styles.stakeholderTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stakeholderName}>{s.contact_name}</Text>
                  {s.designation_role ? (
                    <Text style={styles.stakeholderRole}>{s.designation_role}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteStakeholder(s.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>x</Text>
                </TouchableOpacity>
              </View>
              {s.email ? <Text style={styles.stakeholderDetail}>{s.email}</Text> : null}
              {s.phone ? <Text style={styles.stakeholderDetail}>{s.phone}</Text> : null}
              {s.notes ? <Text style={styles.stakeholderNotes}>{s.notes}</Text> : null}
            </View>
          ))
        )}

        {/* Visit History Placeholder */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visit History</Text>
        </View>
        <View style={styles.visitPlaceholder}>
          <Ionicons name="calendar-outline" size={28} color="#D4C8A0" style={{ marginBottom: 12 }} />
          <Text style={styles.visitPlaceholderTitle}>Coming Soon</Text>
          <Text style={styles.visitPlaceholderText}>
            Visit logs and check-in history will appear here once the feature is enabled.
          </Text>
        </View>
      </ScrollView>

      {/* Add Stakeholder Modal */}
      <Modal visible={showStakeholderForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Stakeholder</Text>
              <TouchableOpacity onPress={() => setShowStakeholderForm(false)}>
                <Text style={styles.modalClose}>x</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 60 }}>
              <Text style={styles.formLabel}>Contact Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Full name"
                placeholderTextColor="#A89070"
                value={shName}
                onChangeText={setShName}
              />

              <Text style={styles.formLabel}>Designation / Role</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. VP Engineering"
                placeholderTextColor="#A89070"
                value={shRole}
                onChangeText={setShRole}
              />

              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="email@company.com"
                placeholderTextColor="#A89070"
                value={shEmail}
                onChangeText={setShEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+1 555-0100"
                placeholderTextColor="#A89070"
                value={shPhone}
                onChangeText={setShPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                placeholder="Any relevant notes"
                placeholderTextColor="#A89070"
                value={shNotes}
                onChangeText={setShNotes}
                multiline
                numberOfLines={3}
              />

              {shError ? (
                <Text style={styles.formErrorText}>{shError}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateStakeholder}
                disabled={shSubmitting}
              >
                <LinearGradient
                  colors={['#C05800', '#A04800']}
                  style={styles.submitButtonGradient}
                >
                  {shSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Add Stakeholder</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBD4',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Oswald_500Medium',
    color: '#6B5540',
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DCC0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF5E4',
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#A89070',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  addSmallButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(192,88,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,88,0,0.3)',
  },
  addSmallButtonText: {
    fontSize: 13,
    fontFamily: 'Oswald_600SemiBold',
    color: '#C05800',
  },
  emptySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptySectionText: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
  },

  // Stakeholder Card
  stakeholderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DCC0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  stakeholderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stakeholderName: {
    fontSize: 15,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },
  stakeholderRole: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#C05800',
    marginTop: 2,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Oswald_600SemiBold',
  },
  stakeholderDetail: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#6B5540',
    marginTop: 4,
  },
  stakeholderNotes: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Visit History Placeholder
  visitPlaceholder: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#E8DCC0',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  visitPlaceholderTitle: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#A89070',
    marginBottom: 6,
  },
  visitPlaceholderText: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 20,
    color: '#A89070',
    fontFamily: 'Oswald_500Medium',
    padding: 4,
  },
  formScroll: {
    paddingHorizontal: 24,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: 'Oswald_600SemiBold',
    color: '#6B5540',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#D4C8A0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Oswald_400Regular',
    color: '#1a1a1a',
  },
  formInputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  formErrorText: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#ef4444',
    marginTop: 16,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#fff',
  },
});
