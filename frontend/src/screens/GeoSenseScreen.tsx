import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import MapView from '../components/MapView';
import {
  createLocationProfile,
  getLocationProfiles,
  deleteLocationProfile,
  LocationProfile,
} from '../services/api';

type LocationCoords = {
  latitude: number;
  longitude: number;
};

type Props = {
  token: string;
};

export default function GeoSenseScreen({ token }: Props) {
  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const [permissionStatus, setPermissionStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Profiles
  const [profiles, setProfiles] = useState<LocationProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'base' | 'client'>('client');
  const [formAddress, setFormAddress] = useState('');
  const [formUseCurrentLocation, setFormUseCurrentLocation] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const requestPermissionAndWatch = async () => {
    setPermissionStatus('loading');
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      setPermissionStatus('denied');
      setLocation({ latitude: 37.7749, longitude: -122.4194 });
      return;
    }

    setPermissionStatus('granted');

    // Try cached position first for instant display
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      setLocation({
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      });
    }

    // Get a quick fix with balanced accuracy (fast network/Wi-Fi)
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });

    // Watch with high accuracy — refines position in the background
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
    }
    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (loc) => {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    );
  };

  const loadProfiles = useCallback(async () => {
    try {
      const data = await getLocationProfiles(token);
      setProfiles(data.profiles);
    } catch {}
  }, [token]);

  useEffect(() => {
    requestPermissionAndWatch();
    loadProfiles();
    return () => {
      subscriptionRef.current?.remove();
    };
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormType('client');
    setFormAddress('');
    setFormUseCurrentLocation(false);
    setFormError('');
  };

  const handleCreateProfile = async () => {
    if (!formName.trim()) {
      setFormError('Profile name is required');
      return;
    }
    if (!formUseCurrentLocation && !formAddress.trim()) {
      setFormError('Address is required when not using current location');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      const payload: any = {
        name: formName.trim(),
        type: formType,
        use_current_location: formUseCurrentLocation,
      };

      if (formUseCurrentLocation && location) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
      } else {
        payload.address = formAddress.trim();
      }

      await createLocationProfile(token, payload);
      await loadProfiles();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create profile');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProfile = async (id: number) => {
    try {
      await deleteLocationProfile(token, id);
      await loadProfiles();
    } catch {}
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Geo-Sense</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Map Area */}
        <View style={styles.mapContainer}>
          {permissionStatus === 'loading' || !location ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3d7b5f" />
              <Text style={styles.loadingText}>Getting location...</Text>
            </View>
          ) : (
            <>
              <MapView
                latitude={location.latitude}
                longitude={location.longitude}
                grayscale={permissionStatus === 'denied'}
                style={styles.map}
              />
              {permissionStatus === 'denied' && (
                <View style={styles.overlay}>
                  <View style={styles.overlayContent}>
                    <Text style={styles.overlayTitle}>Location Required</Text>
                    <Text style={styles.overlayDescription}>
                      Enable location access to see your position on the map.
                    </Text>
                    <TouchableOpacity
                      style={styles.enableButton}
                      onPress={requestPermissionAndWatch}
                    >
                      <LinearGradient
                        colors={['#3d7b5f', '#4a9d7a']}
                        style={styles.enableButtonGradient}
                      >
                        <Text style={styles.enableButtonText}>Enable</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Coordinates Card */}
        {permissionStatus === 'granted' && location && (
          <View style={styles.coordCard}>
            <View style={styles.coordHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            <View style={styles.coordRow}>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <Text style={styles.coordValue}>{location.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <Text style={styles.coordValue}>{location.longitude.toFixed(6)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Location Profiles */}
        <View style={styles.profilesSection}>
          <Text style={styles.profilesSectionTitle}>Location Profiles</Text>
          {profiles.length === 0 ? (
            <View style={styles.emptyProfiles}>
              <Text style={styles.emptyText}>No profiles yet</Text>
              <Text style={styles.emptySubtext}>
                Tap + to create a base or client location
              </Text>
            </View>
          ) : (
            profiles.map((p) => (
              <View key={p.id} style={styles.profileCard}>
                <View style={styles.profileCardHeader}>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{p.name}</Text>
                    <View style={[styles.typeBadge, p.type === 'base' ? styles.baseBadge : styles.clientBadge]}>
                      <Text style={[styles.typeBadgeText, p.type === 'base' ? styles.baseBadgeText : styles.clientBadgeText]}>
                        {p.type === 'base' ? 'Base' : 'Client'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteProfile(p.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>x</Text>
                  </TouchableOpacity>
                </View>
                {p.address ? (
                  <Text style={styles.profileDetail}>{p.address}</Text>
                ) : null}
                {p.latitude != null && p.longitude != null ? (
                  <Text style={styles.profileCoords}>
                    {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                  </Text>
                ) : null}
                {p.use_current_location && (
                  <Text style={styles.profileCaptured}>Captured from GPS</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Profile Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Location Profile</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>x</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              {/* Profile Name */}
              <Text style={styles.formLabel}>Profile Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Office, Client HQ"
                placeholderTextColor="#9ca3af"
                value={formName}
                onChangeText={setFormName}
              />

              {/* Type Selector */}
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeOption, formType === 'base' && styles.typeOptionActive]}
                  onPress={() => setFormType('base')}
                >
                  <Text style={[styles.typeOptionText, formType === 'base' && styles.typeOptionTextActive]}>
                    Base
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeOption, formType === 'client' && styles.typeOptionActive]}
                  onPress={() => setFormType('client')}
                >
                  <Text style={[styles.typeOptionText, formType === 'client' && styles.typeOptionTextActive]}>
                    Client
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Capture Current Location */}
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Capture Current Location</Text>
                <Switch
                  value={formUseCurrentLocation}
                  onValueChange={setFormUseCurrentLocation}
                  trackColor={{ false: '#d1d5db', true: 'rgba(61,123,95,0.4)' }}
                  thumbColor={formUseCurrentLocation ? '#3d7b5f' : '#9ca3af'}
                />
              </View>
              {formUseCurrentLocation && location && (
                <View style={styles.capturedCoords}>
                  <Text style={styles.capturedCoordsText}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
              {formUseCurrentLocation && permissionStatus !== 'granted' && (
                <Text style={styles.warningText}>
                  Location permission not granted — enable it first
                </Text>
              )}

              {/* Address (shown when not using current location) */}
              {!formUseCurrentLocation && (
                <>
                  <Text style={styles.formLabel}>Address</Text>
                  <TextInput
                    style={[styles.formInput, styles.formInputMultiline]}
                    placeholder="Enter the full address"
                    placeholderTextColor="#9ca3af"
                    value={formAddress}
                    onChangeText={setFormAddress}
                    multiline
                    numberOfLines={2}
                  />
                </>
              )}

              {formError ? (
                <Text style={styles.formErrorText}>{formError}</Text>
              ) : null}

              {/* Submit */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateProfile}
                disabled={formSubmitting}
              >
                <LinearGradient
                  colors={['#3d7b5f', '#4a9d7a']}
                  style={styles.submitButtonGradient}
                >
                  {formSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Profile</Text>
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
    backgroundColor: '#f5f5f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    letterSpacing: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(61,123,95,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(61,123,95,0.3)',
  },
  addButtonText: {
    color: '#3d7b5f',
    fontSize: 22,
    fontFamily: 'Oswald_600SemiBold',
    marginTop: -1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mapContainer: {
    height: 280,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    borderRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  overlayContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  overlayTitle: {
    fontSize: 20,
    fontFamily: 'Oswald_700Bold',
    color: '#fff',
    marginBottom: 8,
  },
  overlayDescription: {
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  enableButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  enableButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 24,
  },
  enableButtonText: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#fff',
  },
  coordCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 20,
  },
  coordHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  liveText: {
    fontSize: 13,
    fontFamily: 'Oswald_600SemiBold',
    color: '#22c55e',
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordItem: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    marginBottom: 4,
  },
  coordValue: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },

  // Profiles Section
  profilesSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  profilesSectionTitle: {
    fontSize: 18,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  emptyProfiles: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Oswald_500Medium',
    color: '#4a5568',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  profileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
    marginRight: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  baseBadge: {
    backgroundColor: 'rgba(61,123,95,0.1)',
  },
  clientBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Oswald_600SemiBold',
  },
  baseBadgeText: {
    color: '#3d7b5f',
  },
  clientBadgeText: {
    color: '#22c55e',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Oswald_600SemiBold',
  },
  profileDetail: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
    marginBottom: 4,
  },
  profileCoords: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
  },
  profileCaptured: {
    fontSize: 11,
    fontFamily: 'Oswald_500Medium',
    color: '#22c55e',
    marginTop: 4,
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
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 20,
    color: '#9ca3af',
    fontFamily: 'Oswald_500Medium',
    padding: 4,
  },
  formScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: 'Oswald_600SemiBold',
    color: '#4a5568',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Oswald_400Regular',
    color: '#1a1a1a',
  },
  formInputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: '#3d7b5f',
    backgroundColor: 'rgba(61,123,95,0.1)',
  },
  typeOptionText: {
    fontSize: 14,
    fontFamily: 'Oswald_500Medium',
    color: '#9ca3af',
  },
  typeOptionTextActive: {
    color: '#3d7b5f',
    fontFamily: 'Oswald_600SemiBold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 0,
  },
  capturedCoords: {
    backgroundColor: 'rgba(61,123,95,0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  capturedCoordsText: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#3d7b5f',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#f59e0b',
    marginTop: 8,
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
    marginBottom: 40,
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
