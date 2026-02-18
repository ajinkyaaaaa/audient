import React, { useState, useEffect, useCallback } from 'react';
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
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { getOrgConfig, updateOrgConfig, OrgConfig } from '../services/api';

type ConfigScreenProps = {
  token: string;
};

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

export default function ConfigScreen({ token }: ConfigScreenProps) {
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

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const loadConfig = useCallback(async () => {
    try {
      const data = await getOrgConfig(token);
      setConfig(data.config);
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validate time format
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
      const data = await updateOrgConfig(token, config);
      setConfig(data.config);
      setSuccess('Configuration saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#C05800" size="large" style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
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
});
