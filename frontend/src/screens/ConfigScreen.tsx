import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { getOrgConfig, updateOrgConfig, OrgConfig } from '../services/api';
import ClientLocationMap from '../components/ClientLocationMap';
import { ConfigStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<ConfigStackParamList, 'ConfigMain'>;
type Route = RouteProp<ConfigStackParamList, 'ConfigMain'>;

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const GEOFENCE_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 50,  label: '50m',  desc: 'Tight – within a single floor' },
  { value: 120, label: '120m', desc: 'Standard – building-wide' },
  { value: 200, label: '200m', desc: 'Wide – campus or block' },
];

export default function ConfigScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  const [config, setConfig] = useState<OrgConfig>({
    login_time: '09:00',
    logoff_time: '18:00',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTzPicker, setShowTzPicker] = useState(false);

  // Base location state
  const [baseLat, setBaseLat] = useState<number | null>(null);
  const [baseLng, setBaseLng] = useState<number | null>(null);
  const [baseLabel, setBaseLabel] = useState('Base');
  const [baseAddress, setBaseAddress] = useState('');
  const [baseOfficeDetails, setBaseOfficeDetails] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState<number>(120);

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  // Track whether we have unsaved picker data so loadConfig won't overwrite it
  const hasPickerData = useRef(false);

  const loadConfig = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getOrgConfig(token);
      setConfig(data.config);
      // Only set base location state from server if we don't have unsaved picker data
      if (!hasPickerData.current) {
        setBaseLat(data.config.base_lat ?? null);
        setBaseLng(data.config.base_lng ?? null);
        setBaseLabel(data.config.base_label ?? 'Base');
        setBaseAddress(data.config.base_address ?? '');
        setBaseOfficeDetails(data.config.base_office_details ?? '');
        setGeofenceRadius(data.config.base_geofence_radius ?? 120);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Consume picked location from BaseLocationPickerScreen then clear params
  useEffect(() => {
    const params = route.params;
    if (!params?.pickedLat) return;
    hasPickerData.current = true;
    setBaseLat(params.pickedLat);
    setBaseLng(params.pickedLng ?? null);
    setBaseAddress(params.pickedAddress ?? '');
    setBaseLabel(params.pickedLabel ?? 'Base');
    setBaseOfficeDetails(params.pickedOfficeDetails ?? '');
    // Clear so they don't re-apply on subsequent renders
    navigation.setParams({
      pickedLat: undefined,
      pickedLng: undefined,
      pickedAddress: undefined,
      pickedLabel: undefined,
      pickedOfficeDetails: undefined,
    });
  }, [route.params]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setError('');
    setSuccess('');

    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(config.login_time)) {
      setError('Login time must be in HH:MM format');
      return;
    }
    if (!timePattern.test(config.logoff_time)) {
      setError('Logoff time must be in HH:MM format');
      return;
    }
    if (config.login_time >= config.logoff_time) {
      setError('Login time must be before logoff time');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<OrgConfig> = { ...config };
      if (baseLat !== null) payload.base_lat = baseLat;
      if (baseLng !== null) payload.base_lng = baseLng;
      payload.base_label = baseLabel;
      payload.base_address = baseAddress;
      payload.base_office_details = baseOfficeDetails;
      payload.base_geofence_radius = geofenceRadius;
      const data = await updateOrgConfig(token, payload);
      setConfig(data.config);
      // Sync confirmed server values back into local state
      setBaseLat(data.config.base_lat ?? null);
      setBaseLng(data.config.base_lng ?? null);
      setBaseLabel(data.config.base_label ?? 'Base');
      setBaseAddress(data.config.base_address ?? '');
      setBaseOfficeDetails(data.config.base_office_details ?? '');
      setGeofenceRadius(data.config.base_geofence_radius ?? 120);
      hasPickerData.current = false; // Data is now saved to server
      setSuccess('Configuration saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const openLocationPicker = () => {
    navigation.navigate('BaseLocationPicker', {
      initialLat: baseLat,
      initialLng: baseLng,
      initialLabel: baseLabel,
      initialAddress: baseAddress,
      initialOfficeDetails: baseOfficeDetails,
    });
  };

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#C05800" size="large" style={{ marginTop: 80 }} />
      </View>
    );
  }

  const radiusLabel = `${geofenceRadius}m`;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {Platform.OS !== 'web' && (
              <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
                <Ionicons name="menu" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            )}
            <Ionicons name="settings" size={24} color="#C05800" />
            <Text style={styles.title}>Configuration</Text>
          </View>
          <Text style={styles.subtitle}>Organization work hours & timezone</Text>
        </View>

        {/* Messages */}
        {success ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Join Code Card */}
        {config.join_code ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={20} color="#C05800" />
              <Text style={styles.cardTitle}>Team Join Code</Text>
            </View>
            <Text style={styles.cardDescription}>
              Share this code with employees so they can register and join your organization.
            </Text>
            <View style={styles.joinCodeBox}>
              <Text style={styles.joinCodeText}>{config.join_code}</Text>
            </View>
            {config.org_name ? (
              <Text style={styles.orgNameText}>Organization: {config.org_name}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Work Hours Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={20} color="#C05800" />
            <Text style={styles.cardTitle}>Work Hours</Text>
          </View>
          <Text style={styles.cardDescription}>
            Define when the workday starts and ends. GPS location is only captured during these hours.
          </Text>

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Login Time</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="sunny-outline" size={16} color="#C05800" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={config.login_time}
                  onChangeText={(text) => setConfig({ ...config, login_time: text })}
                  placeholder="09:00"
                  placeholderTextColor="#D4C8A0"
                  maxLength={5}
                />
              </View>
            </View>
            <View style={styles.timeSeparator}>
              <Ionicons name="arrow-forward" size={16} color="#D4C8A0" />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Logoff Time</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="moon-outline" size={16} color="#C05800" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={config.logoff_time}
                  onChangeText={(text) => setConfig({ ...config, logoff_time: text })}
                  placeholder="18:00"
                  placeholderTextColor="#D4C8A0"
                  maxLength={5}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Timezone Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="globe" size={20} color="#C05800" />
            <Text style={styles.cardTitle}>Timezone</Text>
          </View>
          <Text style={styles.cardDescription}>
            Used to determine work hours boundaries and login period tagging.
          </Text>

          <TouchableOpacity
            style={styles.tzSelector}
            onPress={() => setShowTzPicker(!showTzPicker)}
            activeOpacity={0.7}
          >
            <Text style={styles.tzSelectorText}>{config.timezone}</Text>
            <Ionicons
              name={showTzPicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#6B5540"
            />
          </TouchableOpacity>

          {showTzPicker && (
            <View style={styles.tzList}>
              {COMMON_TIMEZONES.map((tz) => (
                <TouchableOpacity
                  key={tz}
                  style={[styles.tzOption, tz === config.timezone && styles.tzOptionActive]}
                  onPress={() => {
                    setConfig({ ...config, timezone: tz });
                    setShowTzPicker(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[styles.tzOptionText, tz === config.timezone && styles.tzOptionTextActive]}
                  >
                    {tz}
                  </Text>
                  {tz === config.timezone && (
                    <Ionicons name="checkmark" size={16} color="#C05800" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Location Sync Interval Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="navigate" size={20} color="#C05800" />
            <Text style={styles.cardTitle}>Location Sync Interval</Text>
          </View>
          <Text style={styles.cardDescription}>
            How often employee devices stream their GPS location to the server (in seconds). Lower values give more accurate live tracking.
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="timer-outline" size={16} color="#C05800" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={String(config.location_sync_interval ?? 5)}
              onChangeText={(text) => setConfig({ ...config, location_sync_interval: parseInt(text) || 5 })}
              placeholder="5"
              placeholderTextColor="#D4C8A0"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.inputSuffix}>seconds</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.card, styles.infoCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={20} color="#6B5540" />
            <Text style={[styles.cardTitle, { color: '#6B5540' }]}>How it works</Text>
          </View>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <View style={[styles.infoDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>During work hours</Text> — GPS is captured on login, status shows as Active
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={[styles.infoDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Before login time</Text> — Morning login, no GPS, status shows as Away
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={[styles.infoDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>After logoff time</Text> — Evening login, no GPS, status shows as Away
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={[styles.infoDot, { backgroundColor: '#9ca3af' }]} />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>No login today</Text> — Status shows as Offline
              </Text>
            </View>
          </View>
        </View>

        {/* ── Base Location Card ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="home" size={20} color="#C05800" />
            <Text style={styles.cardTitle}>Base Location</Text>
          </View>
          <Text style={styles.cardDescription}>
            The organization's headquarters. Employees within the geofence radius will be tagged as "At Base Location."
          </Text>

          {baseLat === null ? (
            /* ── Empty state ── */
            <View style={styles.baseEmptyBox}>
              <Ionicons name="location-outline" size={22} color="#A89070" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.baseEmptyTitle}>No base location set</Text>
                <Text style={styles.baseEmptyDesc}>Employees will not be tagged at a base location.</Text>
              </View>
              <TouchableOpacity
                style={styles.baseSetBtn}
                onPress={openLocationPicker}
                activeOpacity={0.75}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.baseSetBtnText}>Set Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Set state ── */
            <View>
              <View style={styles.baseMapWrapper}>
                <ClientLocationMap
                  clientLat={baseLat!}
                  clientLng={baseLng!}
                  userLat={null}
                  userLng={null}
                  style={{ height: 180, borderRadius: 12 }}
                />
              </View>
              <View style={styles.baseInfoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.baseInfoLabel}>{baseLabel || 'Base'}</Text>
                  {baseOfficeDetails ? <Text style={styles.baseOfficeDetails} numberOfLines={2}>{baseOfficeDetails}</Text> : null}
                  {baseAddress ? <Text style={styles.baseInfoAddr} numberOfLines={2}>{baseAddress}</Text> : null}
                  <View style={styles.coordPill}>
                    <Ionicons name="navigate" size={11} color="#C05800" />
                    <Text style={styles.coordText}>
                      {baseLat.toFixed(5)}, {baseLng!.toFixed(5)}
                    </Text>
                  </View>
                  <View style={styles.baseRadiusBadge}>
                    <Ionicons name="radio-button-on" size={12} color="#C05800" />
                    <Text style={styles.baseRadiusText}>
                      Within {radiusLabel} → At Base Location
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.baseEditBtn}
                  onPress={openLocationPicker}
                  activeOpacity={0.75}
                >
                  <Ionicons name="pencil" size={14} color="#C05800" />
                  <Text style={styles.baseEditBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Geofence Radius Card ────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="radio-button-on" size={20} color="#C05800" />
            <Text style={styles.cardTitle}>Geofence Radius</Text>
          </View>
          <Text style={styles.cardDescription}>
            Employees within this radius of the base location are tagged as "At Base Location."
          </Text>

          <View style={styles.geofenceOptions}>
            {GEOFENCE_OPTIONS.map((opt, idx) => {
              const isActive = geofenceRadius === opt.value;
              const isLast = idx === GEOFENCE_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.geofenceOption,
                    isActive && styles.geofenceOptionActive,
                    !isLast && styles.geofenceOptionBorder,
                  ]}
                  onPress={() => setGeofenceRadius(opt.value)}
                  activeOpacity={0.65}
                >
                  {/* Radio indicator */}
                  <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                    {isActive && <View style={styles.radioInner} />}
                  </View>

                  {/* Labels */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.geofenceLabel, isActive && styles.geofenceLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.geofenceDesc}>{opt.desc}</Text>
                  </View>

                  {isActive && (
                    <View style={styles.geofenceActiveBadge}>
                      <Text style={styles.geofenceActiveBadgeText}>Selected</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Configuration</Text>
            </>
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
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingBottom: 40,
    maxWidth: 640,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hamburger: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
    marginTop: 4,
    marginLeft: 34,
  },

  // Messages
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    color: '#16A34A',
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    marginBottom: 20,
    lineHeight: 18,
  },
  joinCodeBox: {
    backgroundColor: '#FFF9E6',
    borderWidth: 2,
    borderColor: '#C05800',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  joinCodeText: {
    fontSize: 26,
    fontFamily: 'Oswald_700Bold',
    color: '#C05800',
    letterSpacing: 4,
  },
  orgNameText: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    textAlign: 'center',
  },

  // Time inputs
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
    color: '#6B5540',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#D4C8A0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },
  timeSeparator: {
    paddingBottom: 14,
  },
  inputSuffix: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#A89070',
    marginLeft: 4,
  },

  // Timezone
  tzSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#D4C8A0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  tzSelectorText: {
    fontSize: 15,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },
  tzList: {
    marginTop: 8,
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#D4C8A0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tzOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,200,160,0.3)',
  },
  tzOptionActive: {
    backgroundColor: 'rgba(192,88,0,0.06)',
  },
  tzOptionText: {
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
  },
  tzOptionTextActive: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#C05800',
  },

  // Info card
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: '#e5e7eb',
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#6B5540',
    lineHeight: 18,
  },
  infoBold: {
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },

  // Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C05800',
    borderRadius: 12,
    height: 52,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
  },

  // Base location
  baseEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C8A0',
    padding: 14,
    gap: 4,
  },
  baseEmptyTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 14,
    color: '#1a1a1a',
  },
  baseEmptyDesc: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 12,
    color: '#A89070',
    marginTop: 2,
  },
  baseSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C05800',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  baseSetBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  baseMapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  baseInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  baseInfoLabel: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 15,
    color: '#1a1a1a',
  },
  baseOfficeDetails: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 13,
    color: '#6B5540',
    marginTop: 2,
  },
  baseInfoAddr: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 12,
    color: '#A89070',
    marginTop: 2,
    lineHeight: 17,
  },
  coordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(192,88,0,0.07)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  coordText: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 11,
    color: '#C05800',
    letterSpacing: 0.2,
  },
  baseRadiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  baseRadiusText: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 11,
    color: '#C05800',
  },
  baseEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#C05800',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  baseEditBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 13,
    color: '#C05800',
  },

  // Geofence radius
  geofenceOptions: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    overflow: 'hidden',
  },
  geofenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  geofenceOptionActive: {
    backgroundColor: 'rgba(192,88,0,0.04)',
  },
  geofenceOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAD8',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D4C8A0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#C05800',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C05800',
  },
  geofenceLabel: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 15,
    color: '#6B5540',
  },
  geofenceLabelActive: {
    color: '#C05800',
  },
  geofenceDesc: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 12,
    color: '#A89070',
    marginTop: 1,
  },
  geofenceActiveBadge: {
    backgroundColor: 'rgba(192,88,0,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  geofenceActiveBadgeText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 11,
    color: '#C05800',
  },
});
