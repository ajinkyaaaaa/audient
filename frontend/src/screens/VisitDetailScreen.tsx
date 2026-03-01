import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Animated,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';

// ─── Types ────────────────────────────────────────────────────────────────────

type VisitStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
type VisitType = 'assigned' | 'self';

type Stakeholder = {
  id: string;
  name: string;
  role: string;
  isDefault: boolean;
};

type Props = {
  visitId: string;
  clientCode: string;
  clientName: string;
  time: string;
  location: string;
  status: VisitStatus;
  type: VisitType;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<VisitStatus, {
  label: string;
  icon: any;
  color: string;
  dimColor: string;
  gradient: [string, string];
  description: string;
}> = {
  upcoming: {
    label: 'Upcoming',
    icon: 'time-outline',
    color: '#9CA3AF',
    dimColor: 'rgba(156,163,175,0.18)',
    gradient: ['#2D3748', '#1A202C'],
    description: 'Scheduled and awaiting execution',
  },
  'in-progress': {
    label: 'In Progress',
    icon: 'radio-button-on',
    color: '#F59E0B',
    dimColor: 'rgba(245,158,11,0.18)',
    gradient: ['#78350F', '#3D1A05'],
    description: 'Visit is currently underway',
  },
  completed: {
    label: 'Completed',
    icon: 'checkmark-circle',
    color: '#22C55E',
    dimColor: 'rgba(34,197,94,0.18)',
    gradient: ['#166534', '#052E16'],
    description: 'Visit successfully completed',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'close-circle',
    color: '#F87171',
    dimColor: 'rgba(248,113,113,0.18)',
    gradient: ['#7F1D1D', '#3B0A0A'],
    description: 'Visit has been cancelled',
  },
  postponed: {
    label: 'Postponed',
    icon: 'pause-circle',
    color: '#A78BFA',
    dimColor: 'rgba(167,139,250,0.18)',
    gradient: ['#4C1D95', '#2E1065'],
    description: 'Visit rescheduled for a later date',
  },
};

// Mock engagement default stakeholders (will be API-driven later)
const ENGAGEMENT_STAKEHOLDERS: Stakeholder[] = [
  { id: 's1', name: 'Sarah Chen',   role: 'VP Technology',    isDefault: true  },
  { id: 's2', name: 'Marcus Reed',  role: 'Procurement Head', isDefault: true  },
  { id: 's3', name: 'Anita Sharma', role: 'Finance Director', isDefault: false },
  { id: 's4', name: 'David Park',   role: 'CTO',              isDefault: false },
];

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisitDetailScreen({
  visitId: _visitId,
  clientCode,
  clientName,
  time,
  location,
  status: initialStatus,
  type,
}: Props) {
  const navigation = useNavigation<any>();

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  // ── State — all hooks before early return ──────────────────────────────────
  const [status, setStatus] = useState<VisitStatus>(initialStatus);
  const [cancelReason, setCancelReason] = useState('');
  const [stakeholderModal, setStakeholderModal] = useState(false);
  const [selected, setSelected] = useState<string[]>(['s1', 's2']);
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // ── Pulse animation for in-progress ───────────────────────────────────────
  const pulseOpacity = useRef(new Animated.Value(0.55)).current;
  const pulseScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'in-progress') {
      pulseOpacity.setValue(0.55);
      pulseScale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseOpacity, { toValue: 1,    duration: 950, useNativeDriver: true }),
          Animated.timing(pulseScale,   { toValue: 1.06, duration: 950, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseOpacity, { toValue: 0.55, duration: 950, useNativeDriver: true }),
          Animated.timing(pulseScale,   { toValue: 1,    duration: 950, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulseOpacity, pulseScale]);

  if (!fontsLoaded) return null;

  // ── Derived ────────────────────────────────────────────────────────────────
  const cfg = STATUS_CONFIG[status];
  const topPad = Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 40 : 24;
  const visibleStakeholders = ENGAGEMENT_STAKEHOLDERS.filter(s => selected.includes(s.id));
  const shownStakeholders = visibleStakeholders.slice(0, 2);
  const moreCount = visibleStakeholders.length - 2;

  const toggleStakeholder = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAction = (action: 'start' | 'complete' | 'postpone' | 'cancel' | 'reopen') => {
    if      (action === 'start')    setStatus('in-progress');
    else if (action === 'complete') setStatus('completed');
    else if (action === 'postpone') setStatus('postponed');
    else if (action === 'cancel')   setStatus('cancelled');
    else if (action === 'reopen')   setStatus('upcoming');
  };

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text style={styles.headerCode}>{clientCode}</Text>
          <Text style={styles.headerClient} numberOfLines={1}>{clientName}</Text>
        </View>

        <View style={[
          styles.typePill,
          { backgroundColor: type === 'assigned' ? 'rgba(79,126,232,0.1)' : 'rgba(192,88,0,0.1)' },
        ]}>
          <Text style={[
            styles.typePillText,
            { color: type === 'assigned' ? '#4F7EE8' : '#C05800' },
          ]}>
            {type === 'assigned' ? 'Assigned' : 'Self'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Status Hero Card ─────────────────────────────────────────────── */}
        <View style={styles.statusHeroWrap}>
          {/* Animated glow ring — only for in-progress */}
          {status === 'in-progress' && (
            <Animated.View
              pointerEvents="none"
              style={[styles.glowRing, {
                borderColor: cfg.color,
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              }]}
            />
          )}

          <View style={styles.statusHero}>
            <LinearGradient
              colors={cfg.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Icon circle */}
            <View style={[styles.statusIconCircle, {
              backgroundColor: cfg.dimColor,
              borderColor: cfg.color,
            }]}>
              <Ionicons name={cfg.icon} size={38} color={cfg.color} />
            </View>

            <Text style={[styles.statusLabel, { color: cfg.color }]}>
              {cfg.label.toUpperCase()}
            </Text>
            <Text style={styles.statusDesc}>{cfg.description}</Text>

            {/* Time chip */}
            <View style={styles.statusTimeChip}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.45)" />
              <Text style={styles.statusTimeText}>{time}</Text>
            </View>
          </View>
        </View>

        {/* ── Cancellation reason input ─────────────────────────────────────── */}
        {status === 'cancelled' && (
          <View style={styles.cancelCard}>
            <View style={styles.cancelCardHeader}>
              <Ionicons name="information-circle-outline" size={16} color="#F87171" />
              <Text style={styles.cancelCardTitle}>Cancellation Reason</Text>
            </View>
            <TextInput
              style={styles.cancelInput}
              placeholder="Enter reason for cancellation..."
              placeholderTextColor="#A89070"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* ── Visit Details ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>VISIT DETAILS</Text>

          {/* Client row */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: 'rgba(79,126,232,0.1)' }]}>
              <Ionicons name="business-outline" size={16} color="#4F7EE8" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Client</Text>
              <Text style={styles.detailValue}>{clientName}</Text>
            </View>
            <Text style={styles.detailCode}>{clientCode}</Text>
          </View>

          <View style={styles.detailDivider} />

          {/* Time row */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Scheduled time</Text>
              <Text style={styles.detailValue}>{time}</Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          {/* Type row */}
          <View style={styles.detailRow}>
            <View style={[
              styles.detailIcon,
              { backgroundColor: type === 'assigned' ? 'rgba(79,126,232,0.1)' : 'rgba(192,88,0,0.1)' },
            ]}>
              <Ionicons
                name={type === 'assigned' ? 'person-outline' : 'add-circle-outline'}
                size={16}
                color={type === 'assigned' ? '#4F7EE8' : '#C05800'}
              />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Visit type</Text>
              <Text style={styles.detailValue}>
                {type === 'assigned' ? 'Assigned by manager' : 'Self-initiated'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stakeholders ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>STAKEHOLDERS</Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => setStakeholderModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.manageBtnText}>Manage</Text>
              <Ionicons name="chevron-forward" size={13} color="#C05800" />
            </TouchableOpacity>
          </View>

          {visibleStakeholders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={28} color="#D1C8B8" />
              <Text style={styles.emptyStateText}>No stakeholders added yet</Text>
            </View>
          ) : (
            <View>
              {shownStakeholders.map((s, i) => (
                <View key={s.id} style={[styles.stakeholderRow, i > 0 && { marginTop: 12 }]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(s.name)}</Text>
                  </View>
                  <View style={styles.stakeholderInfo}>
                    <Text style={styles.stakeholderName}>{s.name}</Text>
                    <Text style={styles.stakeholderRole}>{s.role}</Text>
                  </View>
                  {s.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
              ))}
              {moreCount > 0 && (
                <TouchableOpacity
                  style={styles.moreRow}
                  onPress={() => setStakeholderModal(true)}
                >
                  <Text style={styles.moreText}>
                    +{moreCount} more stakeholder{moreCount > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Location ──────────────────────────────────────────────────────── */}
        <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          {/* Map placeholder */}
          <View style={styles.mapPlaceholder}>
            <LinearGradient
              colors={['#162518', '#243B2E', '#162518']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Subtle grid */}
            {[20, 45, 70].map(pct => (
              <View key={`h${pct}`} style={[styles.gridLineH, { top: `${pct}%` as any }]} />
            ))}
            {[25, 50, 75].map(pct => (
              <View key={`v${pct}`} style={[styles.gridLineV, { left: `${pct}%` as any }]} />
            ))}

            {/* GPS pin */}
            <View style={styles.mapPinOuter}>
              <View style={styles.mapPinInner}>
                <Ionicons name="location" size={22} color="#22C55E" />
              </View>
            </View>

            <View style={styles.mapLabelChip}>
              <Ionicons name="map-outline" size={11} color="rgba(34,197,94,0.55)" />
              <Text style={styles.mapLabelText}>MAP PREVIEW</Text>
            </View>
          </View>

          {/* Location text */}
          <View style={styles.locationInfo}>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={15} color="#C05800" />
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationLabel}>Office Location</Text>
                <Text style={styles.locationValue}>{location}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.openMapBtn} activeOpacity={0.72}>
              <Text style={styles.openMapBtnText}>Open in Maps</Text>
              <Ionicons name="navigate-outline" size={14} color="#4F7EE8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom Action Bar ─────────────────────────────────────────────── */}
      <View style={styles.actionBar}>
        {(status === 'upcoming' || status === 'postponed') && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnPrimary]}
              onPress={() => handleAction('start')}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={15} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Start Visit</Text>
            </TouchableOpacity>
            {status === 'upcoming' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnSecondary]}
                onPress={() => handleAction('postpone')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSecondaryText}>Postpone</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnDanger]}
              onPress={() => handleAction('cancel')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnDangerText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'in-progress' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnSuccess]}
              onPress={() => handleAction('complete')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Mark Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnSecondary]}
              onPress={() => handleAction('postpone')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSecondaryText}>Postpone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnDanger]}
              onPress={() => handleAction('cancel')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnDangerText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {(status === 'completed' || status === 'cancelled') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnSecondary, { flex: 1 }]}
            onPress={() => handleAction('reopen')}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={15} color="#6B5540" />
            <Text style={styles.btnSecondaryText}>Reopen Visit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Stakeholder Management Modal ─────────────────────────────────── */}
      <Modal
        visible={stakeholderModal}
        animationType="slide"
        transparent
        onRequestClose={() => setStakeholderModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStakeholderModal(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalSheet}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Manage Stakeholders</Text>
          <Text style={styles.modalSubtitle}>
            Select from engagement defaults or add custom
          </Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ENGAGEMENT_STAKEHOLDERS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.modalRow}
                onPress={() => toggleStakeholder(s.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  selected.includes(s.id) && styles.checkboxChecked,
                ]}>
                  {selected.includes(s.id) && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>{initials(s.name)}</Text>
                </View>
                <View style={styles.modalStakeholderInfo}>
                  <Text style={styles.modalStakeholderName}>{s.name}</Text>
                  <Text style={styles.modalStakeholderRole}>{s.role}</Text>
                </View>
                {s.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Add custom stakeholder */}
            <TouchableOpacity
              style={styles.addCustomBtn}
              onPress={() => setShowAddCustom(v => !v)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showAddCustom ? 'remove-circle-outline' : 'add-circle-outline'}
                size={18}
                color="#C05800"
              />
              <Text style={styles.addCustomBtnText}>
                {showAddCustom ? 'Collapse' : 'Add Custom Stakeholder'}
              </Text>
            </TouchableOpacity>

            {showAddCustom && (
              <View style={styles.customForm}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Full Name"
                  placeholderTextColor="#A89070"
                  value={customName}
                  onChangeText={setCustomName}
                />
                <TextInput
                  style={styles.customInput}
                  placeholder="Role / Designation"
                  placeholderTextColor="#A89070"
                  value={customRole}
                  onChangeText={setCustomRole}
                />
                <TouchableOpacity
                  style={styles.addCustomSaveBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (customName.trim()) {
                      setCustomName('');
                      setCustomRole('');
                      setShowAddCustom(false);
                    }
                  }}
                >
                  <Text style={styles.addCustomSaveBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <TouchableOpacity
            style={styles.modalDoneBtn}
            onPress={() => setStakeholderModal(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.modalDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F4EF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DF',
    gap: 10,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1 },
  headerCode: {
    fontFamily: 'Oswald_700Bold', fontSize: 17, color: '#1a1a1a', letterSpacing: 1,
  },
  headerClient: {
    fontFamily: 'Oswald_400Regular', fontSize: 13, color: '#A89070', marginTop: 2,
  },
  typePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  typePillText: { fontFamily: 'Oswald_600SemiBold', fontSize: 11, letterSpacing: 0.3 },

  // ── Status hero card
  statusHeroWrap: { marginBottom: 14 },
  glowRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 22,
    borderWidth: 2,
  },
  statusHero: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  statusIconCircle: {
    width: 76, height: 76, borderRadius: 38,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 6,
  },
  statusLabel: {
    fontFamily: 'Oswald_700Bold', fontSize: 28, letterSpacing: 2.5,
  },
  statusDesc: {
    fontFamily: 'Oswald_400Regular', fontSize: 13,
    color: 'rgba(255,255,255,0.42)', textAlign: 'center',
  },
  statusTimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7,
  },
  statusTimeText: {
    fontFamily: 'Oswald_500Medium', fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },

  // ── Cancellation reason
  cancelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  cancelCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  cancelCardTitle: {
    fontFamily: 'Oswald_600SemiBold', fontSize: 13, color: '#F87171',
  },
  cancelInput: {
    backgroundColor: '#FFF9E6',
    borderRadius: 10, borderWidth: 1, borderColor: '#D4C8A0',
    padding: 12,
    fontFamily: 'Oswald_400Regular', fontSize: 14, color: '#1a1a1a',
    minHeight: 72,
  },

  // ── Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDE8DF',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Oswald_600SemiBold', fontSize: 11,
    color: '#A89070', letterSpacing: 1.4, marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  manageBtnText: { fontFamily: 'Oswald_600SemiBold', fontSize: 13, color: '#C05800' },

  // ── Detail rows
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  detailText: { flex: 1 },
  detailLabel: {
    fontFamily: 'Oswald_400Regular', fontSize: 11, color: '#A89070', letterSpacing: 0.3,
  },
  detailValue: {
    fontFamily: 'Oswald_600SemiBold', fontSize: 15, color: '#1a1a1a', marginTop: 1,
  },
  detailCode: {
    fontFamily: 'Oswald_700Bold', fontSize: 13, color: '#6B5540', letterSpacing: 0.8,
  },
  detailDivider: { height: 1, backgroundColor: '#F5F4EF', marginVertical: 12 },

  // ── Stakeholders
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  emptyStateText: { fontFamily: 'Oswald_400Regular', fontSize: 13, color: '#C8BFB0' },
  stakeholderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2D4A3E',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: 'Oswald_700Bold', fontSize: 13, color: '#FFFFFF', letterSpacing: 0.4 },
  stakeholderInfo: { flex: 1 },
  stakeholderName: { fontFamily: 'Oswald_600SemiBold', fontSize: 14, color: '#1a1a1a' },
  stakeholderRole: { fontFamily: 'Oswald_400Regular', fontSize: 12, color: '#A89070', marginTop: 1 },
  defaultBadge: {
    backgroundColor: 'rgba(192,88,0,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  defaultBadgeText: { fontFamily: 'Oswald_500Medium', fontSize: 10, color: '#C05800' },
  moreRow: { marginTop: 12, paddingVertical: 2 },
  moreText: { fontFamily: 'Oswald_500Medium', fontSize: 13, color: '#C05800' },

  // ── Map placeholder
  mapPlaceholder: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLineH: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(34,197,94,0.07)',
  },
  gridLineV: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(34,197,94,0.07)',
  },
  mapPinOuter: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(34,197,94,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  mapPinInner: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(34,197,94,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  mapLabelChip: {
    position: 'absolute', bottom: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  mapLabelText: {
    fontFamily: 'Oswald_500Medium', fontSize: 10,
    color: 'rgba(34,197,94,0.45)', letterSpacing: 1.2,
  },
  locationInfo: { padding: 14, gap: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  locationTextWrap: { flex: 1 },
  locationLabel: { fontFamily: 'Oswald_400Regular', fontSize: 11, color: '#A89070' },
  locationValue: { fontFamily: 'Oswald_600SemiBold', fontSize: 14, color: '#1a1a1a', marginTop: 2 },
  openMapBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end' },
  openMapBtnText: { fontFamily: 'Oswald_600SemiBold', fontSize: 13, color: '#4F7EE8' },

  // ── Action bar
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDE8DF',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
  },
  btnPrimary:   { backgroundColor: '#C05800' },
  btnSuccess:   { backgroundColor: '#16A34A' },
  btnSecondary: {
    backgroundColor: 'rgba(168,144,112,0.1)',
    borderWidth: 1, borderColor: 'rgba(168,144,112,0.25)',
  },
  btnDanger: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.28)',
  },
  btnPrimaryText:   { fontFamily: 'Oswald_600SemiBold', fontSize: 13, color: '#FFFFFF', letterSpacing: 0.3 },
  btnSecondaryText: { fontFamily: 'Oswald_600SemiBold', fontSize: 13, color: '#6B5540' },
  btnDangerText:    { fontFamily: 'Oswald_600SemiBold', fontSize: 13, color: '#F87171' },

  // ── Stakeholder Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)' },
  modalSheet: {
    backgroundColor: '#FDFBD4',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#D4C8A0',
    alignSelf: 'center', marginBottom: 18,
  },
  modalTitle: {
    fontFamily: 'Oswald_700Bold', fontSize: 22, color: '#1a1a1a', marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: 'Oswald_400Regular', fontSize: 13, color: '#A89070', marginBottom: 20,
  },
  modalScroll: { flex: 1 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#EDE8DF',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#D4C8A0',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  modalAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2D4A3E',
    justifyContent: 'center', alignItems: 'center',
  },
  modalAvatarText: { fontFamily: 'Oswald_700Bold', fontSize: 13, color: '#FFFFFF' },
  modalStakeholderInfo: { flex: 1 },
  modalStakeholderName: { fontFamily: 'Oswald_600SemiBold', fontSize: 14, color: '#1a1a1a' },
  modalStakeholderRole: { fontFamily: 'Oswald_400Regular', fontSize: 12, color: '#A89070' },
  addCustomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14,
  },
  addCustomBtnText: { fontFamily: 'Oswald_600SemiBold', fontSize: 14, color: '#C05800' },
  customForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E8DCC0',
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: '#FFF9E6',
    borderRadius: 10, borderWidth: 1, borderColor: '#D4C8A0',
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: 'Oswald_400Regular', fontSize: 14, color: '#1a1a1a',
  },
  addCustomSaveBtn: {
    backgroundColor: '#C05800',
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center',
  },
  addCustomSaveBtnText: {
    fontFamily: 'Oswald_600SemiBold', fontSize: 14, color: '#FFFFFF',
  },
  modalDoneBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  modalDoneBtnText: {
    fontFamily: 'Oswald_600SemiBold', fontSize: 15, color: '#FFFFFF', letterSpacing: 0.3,
  },
});
