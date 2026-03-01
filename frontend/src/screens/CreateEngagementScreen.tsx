import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { createClient, getMasterClients, MasterClient } from '../services/api';
import { EngagementsStackParamList } from '../navigation/types';
import LocationPicker from '../components/LocationPicker';

type Props = { token: string };
type NavProp = NativeStackNavigationProp<EngagementsStackParamList>;

const TIER_OPTIONS = ['Strategic', 'Normal', 'Low Touch'] as const;
const TOTAL_STEPS = 3;

const TIER_META: Record<string, { icon: string; color: string; desc: string }> = {
  Strategic: { icon: 'star', color: '#C05800', desc: 'Top-tier, high-value' },
  Normal: { icon: 'ellipse', color: '#6B5540', desc: 'Standard engagement' },
  'Low Touch': { icon: 'remove-circle-outline', color: '#A89070', desc: 'Minimal interaction' },
};

// ── Reusable form field row ─────────────────────────────────────────────────

type FieldProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  children: React.ReactNode;
  row?: boolean;
};

function Field({ label, icon, required, children, row }: FieldProps) {
  return (
    <View style={[fieldStyles.wrapper, row && fieldStyles.wrapperRow]}>
      <View style={fieldStyles.labelRow}>
        {icon && <Ionicons name={icon} size={11} color="#A89070" style={{ marginRight: 4 }} />}
        <Text style={fieldStyles.label}>
          {label.toUpperCase()}
          {required && <Text style={fieldStyles.req}> *</Text>}
        </Text>
      </View>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { flex: 1, marginBottom: 4 },
  wrapperRow: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  label: {
    fontSize: 10,
    fontFamily: 'Oswald_600SemiBold',
    color: '#A89070',
    letterSpacing: 0.8,
  },
  req: { color: '#C05800' },
});

// ── Section card ────────────────────────────────────────────────────────────

type SectionProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
};

function Section({ title, icon, children }: SectionProps) {
  return (
    <View style={secStyles.card}>
      <View style={secStyles.header}>
        <View style={secStyles.iconBadge}>
          <Ionicons name={icon} size={14} color="#C05800" />
        </View>
        <Text style={secStyles.title}>{title}</Text>
      </View>
      <View style={secStyles.body}>{children}</View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE8DF',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F4EF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DF',
    gap: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(192,88,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontFamily: 'Oswald_700Bold',
    color: '#6B5540',
    letterSpacing: 1.2,
  },
  body: { padding: 16, gap: 12 },
});

// ── Styled text input ───────────────────────────────────────────────────────

function StyledInput(props: React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      style={[
        inputStyles.input,
        focused && inputStyles.inputFocused,
        props.style,
      ]}
      placeholderTextColor="#B0A898"
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

const inputStyles = StyleSheet.create({
  input: {
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: '#EDE8DF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#1a1a1a',
  },
  inputFocused: {
    borderColor: '#C05800',
    backgroundColor: '#FFFFFF',
  },
});

// ── Main screen ─────────────────────────────────────────────────────────────

export default function CreateEngagementScreen({ token }: Props) {
  const navigation = useNavigation<NavProp>();

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  // ── Step 1: Client Identity + Classification ──
  const [clientName, setClientName] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [website, setWebsite] = useState('');
  const [tier, setTier] = useState<string>('Normal');

  // Autocomplete
  const [masterClients, setMasterClients] = useState<MasterClient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Step 2: Addresses ──
  const [hqLine1, setHqLine1] = useState('');
  const [hqLine2, setHqLine2] = useState('');
  const [hqLine3, setHqLine3] = useState('');
  const [hqCity, setHqCity] = useState('');
  const [hqState, setHqState] = useState('');
  const [hqCountry, setHqCountry] = useState('');

  const [offLine1, setOffLine1] = useState('');
  const [offLine2, setOffLine2] = useState('');
  const [offLine3, setOffLine3] = useState('');
  const [offCity, setOffCity] = useState('');
  const [offState, setOffState] = useState('');
  const [offCountry, setOffCountry] = useState('');

  // ── Step 3: Map pin ──
  const [officeLat, setOfficeLat] = useState<number | null>(null);
  const [officeLng, setOfficeLng] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMasterClients(token)
      .then((data) => setMasterClients(data.clients))
      .catch(() => {});
  }, [token]);

  // Animate progress bar when step changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const suggestions = useMemo(() => {
    const q = clientName.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return masterClients
      .filter((mc) => mc.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [clientName, masterClients]);

  const handleSelectSuggestion = (mc: MasterClient) => {
    setClientName(mc.name);
    setClientCode(mc.code);
    setShowSuggestions(false);
  };

  const buildAddress = (l1: string, l2: string, l3: string, city: string, state: string, country: string) =>
    [l1, l2, l3, city, state, country].filter(Boolean).join(', ');

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!clientName.trim()) { setError('Client name is required'); return; }
      if (!clientCode.trim()) { setError('Client code is required'); return; }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) navigation.goBack();
    else if (step === 2) setStep(1);
    else setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await createClient(token, {
        client_name: clientName.trim(),
        client_code: clientCode.trim().toUpperCase(),
        industry_sector: industry.trim() || undefined,
        company_size: companySize.trim() || undefined,
        website_domain: website.trim() || undefined,
        client_tier: tier,
        headquarters_location:
          buildAddress(hqLine1, hqLine2, hqLine3, hqCity, hqState, hqCountry) || undefined,
        primary_office_location:
          buildAddress(offLine1, offLine2, offLine3, offCity, offState, offCountry) || undefined,
        office_latitude: officeLat ?? undefined,
        office_longitude: officeLng ?? undefined,
      });
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to create engagement');
    } finally {
      setSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  const stepLabels = ['Client Profile', 'Addresses', 'Pin Location'];
  const stepIcons: Array<keyof typeof Ionicons.glyphMap> = [
    'business-outline',
    'location-outline',
    'map-outline',
  ];

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>NEW ENGAGEMENT</Text>
          <Text style={styles.headerSub}>
            Step {step} of {TOTAL_STEPS} — {stepLabels[step - 1]}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Progress bar ────────────────────────────────────────────── */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }) as any,
            },
          ]}
        />
      </View>

      {/* ── Step breadcrumbs ─────────────────────────────────────────── */}
      <View style={styles.breadcrumbRow}>
        {stepLabels.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <React.Fragment key={i}>
              <View style={styles.crumbItem}>
                <View
                  style={[
                    styles.crumbDot,
                    done && styles.crumbDotDone,
                    active && styles.crumbDotActive,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={9} color="#fff" />
                  ) : (
                    <Text style={[styles.crumbNum, active && styles.crumbNumActive]}>{num}</Text>
                  )}
                </View>
                <Text style={[styles.crumbLabel, active && styles.crumbLabelActive]}>{label}</Text>
              </View>
              {i < TOTAL_STEPS - 1 && (
                <View style={[styles.crumbLine, (done || active) && styles.crumbLineActive]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Step 3: Map picker ─────────────────────────────────────── */}
      {step === 3 ? (
        <View style={styles.mapStepContainer}>
          {/* Map — fills most of the step area */}
          <View style={styles.mapWrapper}>
            <LocationPicker
              latitude={officeLat}
              longitude={officeLng}
              onLocationPicked={(lat, lng) => {
                setOfficeLat(lat);
                setOfficeLng(lng);
              }}
              style={{ flex: 1 }}
            />
          </View>

          {/* Coordinates display */}
          {officeLat !== null && officeLng !== null && (
            <View style={styles.coordRow}>
              <Ionicons name="location" size={14} color="#C05800" />
              <Text style={styles.coordText}>
                {officeLat.toFixed(6)}°, {officeLng.toFixed(6)}°
              </Text>
              <TouchableOpacity
                onPress={() => { setOfficeLat(null); setOfficeLng(null); }}
                style={styles.clearPinBtn}
              >
                <Text style={styles.clearPinText}>Clear pin</Text>
              </TouchableOpacity>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Actions */}
          <View style={styles.mapActions}>
            <TouchableOpacity onPress={handleBack} style={styles.backAction}>
              <Ionicons name="arrow-back" size={16} color="#6B5540" />
              <Text style={styles.backActionText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={styles.submitBtn}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#C05800', '#A04800']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.submitText}>Register Engagement</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ── Steps 1 & 2: Form ───────────────────────────────────── */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ─────────────── STEP 1 ─────────────────────────────── */}
            {step === 1 && (
              <>
                {/* Client Identity */}
                <Section title="CLIENT IDENTITY" icon="business-outline">
                  <Field label="Client Name" icon="search-outline" required>
                    <StyledInput
                      placeholder="Search or type client name…"
                      value={clientName}
                      onChangeText={(t) => {
                        setClientName(t);
                        setShowSuggestions(true);
                        if (!masterClients.some((mc) => mc.name === t)) setClientCode('');
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <View style={styles.suggestionBox}>
                        {suggestions.map((mc) => (
                          <TouchableOpacity
                            key={mc.code}
                            style={styles.suggestionRow}
                            onPress={() => handleSelectSuggestion(mc)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.suggestionIcon}>
                              <Ionicons name="business" size={12} color="#C05800" />
                            </View>
                            <Text style={styles.suggestionName}>{mc.name}</Text>
                            <Text style={styles.suggestionCode}>{mc.code}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </Field>

                  <Field label="Client Code" icon="barcode-outline" required>
                    <StyledInput
                      placeholder="e.g. ACME"
                      value={clientCode}
                      onChangeText={setClientCode}
                      autoCapitalize="characters"
                    />
                  </Field>

                  <Field label="Website Domain" icon="globe-outline">
                    <StyledInput
                      placeholder="e.g. acme.com"
                      value={website}
                      onChangeText={setWebsite}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </Field>
                </Section>

                {/* Company Details */}
                <Section title="COMPANY DETAILS" icon="layers-outline">
                  <Field label="Industry Sector" icon="briefcase-outline">
                    <StyledInput
                      placeholder="e.g. Technology, Healthcare…"
                      value={industry}
                      onChangeText={setIndustry}
                    />
                  </Field>

                  <Field label="Company Size" icon="people-outline">
                    <StyledInput
                      placeholder="e.g. 50–200, Enterprise…"
                      value={companySize}
                      onChangeText={setCompanySize}
                    />
                  </Field>
                </Section>

                {/* Classification */}
                <Section title="CLASSIFICATION" icon="ribbon-outline">
                  <Field label="Client Tier" icon="star-outline">
                    <View style={styles.tierGrid}>
                      {TIER_OPTIONS.map((t) => {
                        const active = tier === t;
                        const meta = TIER_META[t];
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[styles.tierCard, active && styles.tierCardActive]}
                            onPress={() => setTier(t)}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name={meta.icon as keyof typeof Ionicons.glyphMap}
                              size={18}
                              color={active ? meta.color : '#C4B49A'}
                            />
                            <Text style={[styles.tierName, active && { color: meta.color }]}>{t}</Text>
                            <Text style={[styles.tierDesc, active && { color: meta.color, opacity: 0.8 }]}>
                              {meta.desc}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Field>
                </Section>
              </>
            )}

            {/* ─────────────── STEP 2 ─────────────────────────────── */}
            {step === 2 && (
              <>
                {/* Headquarters */}
                <Section title="HEADQUARTERS ADDRESS" icon="home-outline">
                  <Field label="Address Line 1" icon="navigate-outline">
                    <StyledInput
                      placeholder="Street number & name…"
                      value={hqLine1}
                      onChangeText={setHqLine1}
                    />
                  </Field>
                  <Field label="Address Line 2" icon="ellipsis-horizontal-outline">
                    <StyledInput
                      placeholder="Suite, floor, building…"
                      value={hqLine2}
                      onChangeText={setHqLine2}
                    />
                  </Field>
                  <Field label="Address Line 3">
                    <StyledInput
                      placeholder="Area, landmark…"
                      value={hqLine3}
                      onChangeText={setHqLine3}
                    />
                  </Field>
                  <View style={styles.inlineRow}>
                    <Field label="City" icon="location-outline" row>
                      <StyledInput
                        placeholder="City"
                        value={hqCity}
                        onChangeText={setHqCity}
                      />
                    </Field>
                    <View style={{ width: 10 }} />
                    <Field label="State / Province" row>
                      <StyledInput
                        placeholder="State"
                        value={hqState}
                        onChangeText={setHqState}
                      />
                    </Field>
                  </View>
                  <Field label="Country" icon="earth-outline">
                    <StyledInput
                      placeholder="Country"
                      value={hqCountry}
                      onChangeText={setHqCountry}
                    />
                  </Field>
                </Section>

                {/* Primary Office */}
                <Section title="PRIMARY OFFICE ADDRESS" icon="business-outline">
                  <View style={styles.sameAsHqRow}>
                    <Ionicons name="information-circle-outline" size={13} color="#A89070" />
                    <Text style={styles.sameAsHqText}>
                      This is the office you visit. You'll pin it on the map next.
                    </Text>
                  </View>
                  <Field label="Address Line 1" icon="navigate-outline">
                    <StyledInput
                      placeholder="Street number & name…"
                      value={offLine1}
                      onChangeText={setOffLine1}
                    />
                  </Field>
                  <Field label="Address Line 2" icon="ellipsis-horizontal-outline">
                    <StyledInput
                      placeholder="Suite, floor, building…"
                      value={offLine2}
                      onChangeText={setOffLine2}
                    />
                  </Field>
                  <Field label="Address Line 3">
                    <StyledInput
                      placeholder="Area, landmark…"
                      value={offLine3}
                      onChangeText={setOffLine3}
                    />
                  </Field>
                  <View style={styles.inlineRow}>
                    <Field label="City" icon="location-outline" row>
                      <StyledInput
                        placeholder="City"
                        value={offCity}
                        onChangeText={setOffCity}
                      />
                    </Field>
                    <View style={{ width: 10 }} />
                    <Field label="State / Province" row>
                      <StyledInput
                        placeholder="State"
                        value={offState}
                        onChangeText={setOffState}
                      />
                    </Field>
                  </View>
                  <Field label="Country" icon="earth-outline">
                    <StyledInput
                      placeholder="Country"
                      value={offCountry}
                      onChangeText={setOffCountry}
                    />
                  </Field>
                </Section>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* ── Bottom action bar ────────────────────────────────── */}
          <View style={styles.actionBar}>
            <TouchableOpacity onPress={handleBack} style={styles.backAction}>
              <Ionicons name="arrow-back" size={16} color="#6B5540" />
              <Text style={styles.backActionText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextBtn}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#C05800', '#A04800']}
                style={styles.nextGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.nextText}>
                  {step === 2 ? 'Pin Location' : 'Continue'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4EF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#F5F4EF',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8DF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMid: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    marginTop: 1,
  },

  // Progress
  progressTrack: {
    height: 3,
    backgroundColor: '#EDE8DF',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C05800',
    borderRadius: 2,
  },

  // Breadcrumbs
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  crumbItem: {
    alignItems: 'center',
    gap: 4,
  },
  crumbDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EDE8DF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crumbDotActive: {
    backgroundColor: '#C05800',
  },
  crumbDotDone: {
    backgroundColor: '#A04800',
  },
  crumbNum: {
    fontSize: 10,
    fontFamily: 'Oswald_600SemiBold',
    color: '#A89070',
  },
  crumbNumActive: {
    color: '#fff',
  },
  crumbLabel: {
    fontSize: 9,
    fontFamily: 'Oswald_500Medium',
    color: '#A89070',
    letterSpacing: 0.3,
  },
  crumbLabelActive: {
    color: '#C05800',
    fontFamily: 'Oswald_600SemiBold',
  },
  crumbLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EDE8DF',
    marginBottom: 14,
    marginHorizontal: 4,
  },
  crumbLineActive: {
    backgroundColor: '#C05800',
  },

  // Scroll form
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Autocomplete
  suggestionBox: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#EDE8DF',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F4EF',
    gap: 8,
  },
  suggestionIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(192,88,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionName: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#1a1a1a',
  },
  suggestionCode: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
    color: '#A89070',
  },

  // Tier selector
  tierGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    borderWidth: 1.5,
    borderColor: '#EDE8DF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  tierCardActive: {
    borderColor: '#C05800',
    backgroundColor: 'rgba(192,88,0,0.06)',
  },
  tierName: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
    color: '#B0A898',
    textAlign: 'center',
  },
  tierDesc: {
    fontSize: 9,
    fontFamily: 'Oswald_400Regular',
    color: '#B0A898',
    textAlign: 'center',
  },

  // Inline row (city + state)
  inlineRow: {
    flexDirection: 'row',
  },

  // Primary office info
  sameAsHqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(192,88,0,0.05)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  sameAsHqText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    lineHeight: 16,
  },

  // Error
  errorText: {
    fontSize: 12,
    fontFamily: 'Oswald_500Medium',
    color: '#ef4444',
    textAlign: 'center',
    marginVertical: 8,
  },

  // Action bar (steps 1 & 2)
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#EDE8DF',
    backgroundColor: '#F5F4EF',
    gap: 12,
  },
  backAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EDE8DF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  backActionText: {
    fontSize: 13,
    fontFamily: 'Oswald_600SemiBold',
    color: '#6B5540',
  },
  nextBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  nextText: {
    fontSize: 14,
    fontFamily: 'Oswald_600SemiBold',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Step 3: Map
  mapStepContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    gap: 8,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 16,
    // No overflow:hidden — LocationPicker clips its own map internally.
    // Removing it lets the search dropdown overlay extend freely.
    borderWidth: 1.5,
    borderColor: '#EDE8DF',
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8DF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coordText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Oswald_500Medium',
    color: '#6B5540',
  },
  clearPinBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  clearPinText: {
    fontSize: 11,
    fontFamily: 'Oswald_500Medium',
    color: '#ef4444',
  },
  mapActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  submitBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitText: {
    fontSize: 14,
    fontFamily: 'Oswald_600SemiBold',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
