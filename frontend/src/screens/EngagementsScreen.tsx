import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { createClient, getClients, Client } from '../services/api';
import { EngagementsStackParamList } from '../navigation/types';

type Props = {
  token: string;
};

const TIER_OPTIONS = ['Strategic', 'Normal', 'Low Touch'] as const;

const healthColor: Record<string, string> = {
  Good: '#22c55e',
  Neutral: '#f59e0b',
  Risk: '#ef4444',
};

export default function EngagementsScreen({ token }: Props) {
  const drawerNav = useNavigation();
  const stackNav = useNavigation<NativeStackNavigationProp<EngagementsStackParamList>>();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formClientName, setFormClientName] = useState('');
  const [formClientCode, setFormClientCode] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formCompanySize, setFormCompanySize] = useState('');
  const [formHqLocation, setFormHqLocation] = useState('');
  const [formOfficeLocation, setFormOfficeLocation] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formTier, setFormTier] = useState<string>('Normal');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadClients = useCallback(async () => {
    try {
      const data = await getClients(token);
      setClients(data.clients);
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const resetForm = () => {
    setFormClientName('');
    setFormClientCode('');
    setFormIndustry('');
    setFormCompanySize('');
    setFormHqLocation('');
    setFormOfficeLocation('');
    setFormWebsite('');
    setFormTier('Normal');
    setFormError('');
  };

  const handleCreate = async () => {
    if (!formClientName.trim()) {
      setFormError('Client name is required');
      return;
    }
    if (!formClientCode.trim()) {
      setFormError('Client code is required');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      await createClient(token, {
        client_name: formClientName.trim(),
        client_code: formClientCode.trim().toUpperCase(),
        industry_sector: formIndustry.trim() || undefined,
        company_size: formCompanySize.trim() || undefined,
        headquarters_location: formHqLocation.trim() || undefined,
        primary_office_location: formOfficeLocation.trim() || undefined,
        website_domain: formWebsite.trim() || undefined,
        client_tier: formTier,
      });
      await loadClients();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create engagement');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  const openDrawer = () => drawerNav.dispatch(DrawerActions.openDrawer());

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Engagements</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Client List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      ) : clients.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No engagements yet</Text>
          <Text style={styles.emptySubtext}>
            Tap + to register your first client engagement
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {clients.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => stackNav.navigate('ClientDetail', { clientId: c.id })}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={styles.nameRow}>
                    <Text style={styles.clientName}>{c.client_name}</Text>
                    <View style={[styles.healthDot, { backgroundColor: healthColor[c.engagement_health] || '#f59e0b' }]} />
                  </View>
                  <Text style={styles.clientCode}>{c.client_code}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.arrowText}>{'>'}</Text>
                </View>
              </View>

              <View style={styles.cardMeta}>
                {c.industry_sector ? (
                  <View style={styles.metaTag}>
                    <Text style={styles.metaTagText}>{c.industry_sector}</Text>
                  </View>
                ) : null}
                <View style={[styles.metaTag, styles.tierTag]}>
                  <Text style={styles.metaTagText}>{c.client_tier}</Text>
                </View>
                <View style={[
                  styles.statusTag,
                  c.is_active ? styles.activeTag : styles.inactiveTag,
                ]}>
                  <Text style={[
                    styles.statusTagText,
                    c.is_active ? styles.activeTagText : styles.inactiveTagText,
                  ]}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {c.headquarters_location ? (
                <Text style={styles.locationText}>{c.headquarters_location}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { resetForm(); setShowForm(true); }}
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.fabGradient}>
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Engagement Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1a1740', '#2d2760']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Engagement</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>x</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 60 }}>
              {/* Client Name */}
              <Text style={styles.formLabel}>Client Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Acme Corporation"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formClientName}
                onChangeText={setFormClientName}
              />

              {/* Client Code */}
              <Text style={styles.formLabel}>Client Code *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. ACME"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formClientCode}
                onChangeText={setFormClientCode}
                autoCapitalize="characters"
              />

              {/* Industry Sector */}
              <Text style={styles.formLabel}>Industry Sector</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Technology, Healthcare"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formIndustry}
                onChangeText={setFormIndustry}
              />

              {/* Company Size */}
              <Text style={styles.formLabel}>Company Size</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 50-200, Enterprise"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formCompanySize}
                onChangeText={setFormCompanySize}
              />

              {/* HQ Location */}
              <Text style={styles.formLabel}>Headquarters Location</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. New York, NY"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formHqLocation}
                onChangeText={setFormHqLocation}
              />

              {/* Primary Office */}
              <Text style={styles.formLabel}>Primary Office Location</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. San Francisco, CA"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formOfficeLocation}
                onChangeText={setFormOfficeLocation}
              />

              {/* Website */}
              <Text style={styles.formLabel}>Website Domain</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. acme.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formWebsite}
                onChangeText={setFormWebsite}
                autoCapitalize="none"
                keyboardType="url"
              />

              {/* Client Tier */}
              <Text style={styles.formLabel}>Client Tier</Text>
              <View style={styles.tierSelector}>
                {TIER_OPTIONS.map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    style={[styles.tierOption, formTier === tier && styles.tierOptionActive]}
                    onPress={() => setFormTier(tier)}
                  >
                    <Text style={[styles.tierOptionText, formTier === tier && styles.tierOptionTextActive]}>
                      {tier}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formError ? (
                <Text style={styles.formErrorText}>{formError}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreate}
                disabled={formSubmitting}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.submitButtonGradient}
                >
                  {formSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Register Engagement</Text>
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
    backgroundColor: '#0f0c29',
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLeft: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginRight: 8,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clientCode: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  cardRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  metaTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tierTag: {
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  metaTagText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.6)',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTag: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  inactiveTag: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  statusTagText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  activeTagText: {
    color: '#22c55e',
  },
  inactiveTagText: {
    color: '#ef4444',
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    right: 24,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    marginTop: -2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  modalClose: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter_500Medium',
    padding: 4,
  },
  formScroll: {
    paddingHorizontal: 24,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#fff',
  },
  tierSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  tierOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  tierOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  tierOptionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.5)',
  },
  tierOptionTextActive: {
    color: '#818cf8',
    fontFamily: 'Inter_600SemiBold',
  },
  formErrorText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});
