import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import { ConfigStackParamList } from '../navigation/types';
import LocationPicker from '../components/LocationPicker';

type Nav = NativeStackNavigationProp<ConfigStackParamList, 'BaseLocationPicker'>;
type Route = RouteProp<ConfigStackParamList, 'BaseLocationPicker'>;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data.display_name) {
      const parts: string[] = data.display_name.split(', ');
      return parts.slice(0, 4).join(', ');
    }
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function BaseLocationPickerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { initialLat, initialLng, initialLabel, initialAddress, initialOfficeDetails } = route.params;

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const [pickerLat, setPickerLat] = useState<number | null>(initialLat);
  const [pickerLng, setPickerLng] = useState<number | null>(initialLng);
  const [address, setAddress] = useState(initialAddress);
  const [label, setLabel] = useState(initialLabel || 'Base');
  const [officeDetails, setOfficeDetails] = useState(initialOfficeDetails || '');
  const [geocoding, setGeocoding] = useState(false);
  const geocodeTimer = useRef<any>(null);

  const handleLocationPicked = useCallback((lat: number, lng: number) => {
    setPickerLat(lat);
    setPickerLng(lng);

    // Debounced reverse geocode
    clearTimeout(geocodeTimer.current);
    setGeocoding(true);
    geocodeTimer.current = setTimeout(async () => {
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setGeocoding(false);
    }, 600);
  }, []);

  // Reverse geocode initial location if set
  useEffect(() => {
    if (initialLat !== null && initialLng !== null && !initialAddress) {
      setGeocoding(true);
      reverseGeocode(initialLat, initialLng).then((addr) => {
        setAddress(addr);
        setGeocoding(false);
      });
    }
  }, []);

  const handleConfirm = () => {
    if (pickerLat === null || pickerLng === null) return;
    navigation.navigate('ConfigMain', {
      pickedLat: pickerLat,
      pickedLng: pickerLng,
      pickedAddress: address,
      pickedLabel: label,
      pickedOfficeDetails: officeDetails,
    });
  };

  if (!fontsLoaded) return null;

  const topPad = Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 40 : 16;
  const hasPin = pickerLat !== null && pickerLng !== null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Set Base Location</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Map (fills remaining space above bottom panel) ────────────────── */}
      <View style={styles.mapWrapper}>
        <LocationPicker
          latitude={pickerLat}
          longitude={pickerLng}
          onLocationPicked={handleLocationPicked}
          style={{ flex: 1, borderRadius: 0 }}
        />

        {/* Tap-hint overlay — shown only when no pin yet */}
        {!hasPin && (
          <View style={styles.tapHint} pointerEvents="none">
            <View style={styles.tapHintBubble}>
              <Ionicons name="location-outline" size={16} color="#C05800" />
              <Text style={styles.tapHintText}>Search or tap the map to drop a pin</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom panel ─────────────────────────────────────────────────── */}
      <View style={styles.panel}>

        {/* Coordinate pill */}
        {hasPin && (
          <View style={styles.coordPill}>
            <Ionicons name="navigate" size={13} color="#C05800" />
            <Text style={styles.coordText}>
              {pickerLat!.toFixed(6)}, {pickerLng!.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Address row */}
        <View style={styles.addressRow}>
          <View style={styles.addressIconWrap}>
            {geocoding
              ? <ActivityIndicator size="small" color="#C05800" />
              : <Ionicons name="location" size={16} color="#C05800" />
            }
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {hasPin
              ? (geocoding ? 'Getting address…' : (address || 'Address unavailable'))
              : 'No location selected yet'
            }
          </Text>
        </View>

        {/* Label + Office Details row */}
        <View style={styles.fieldsRow}>
          <View style={[styles.labelRow, { flex: 1 }]}>
            <Text style={styles.labelFieldLabel}>LOCATION LABEL</Text>
            <View style={styles.labelInputWrapper}>
              <Ionicons name="home-outline" size={15} color="#C05800" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.labelInput}
                value={label}
                onChangeText={setLabel}
                placeholder="Base"
                placeholderTextColor="#D4C8A0"
              />
            </View>
          </View>
        </View>

        {/* Office Details — multi-line */}
        <View style={styles.labelRow}>
          <Text style={styles.labelFieldLabel}>OFFICE DETAILS</Text>
          <TextInput
            style={styles.officeDetailsInput}
            value={officeDetails}
            onChangeText={setOfficeDetails}
            placeholder={'Main Office, 4th Floor\nBuilding A'}
            placeholderTextColor="#D4C8A0"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, !hasPin && styles.confirmBtnDisabled]}
          disabled={!hasPin}
          onPress={handleConfirm}
          activeOpacity={0.82}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F4EF',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DF',
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F5F4EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
    color: '#1a1a1a',
  },

  // Map
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },

  // Tap hint
  tapHint: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  tapHintBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EDE8DF',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tapHintText: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 13,
    color: '#6B5540',
  },

  // Bottom panel
  panel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderTopColor: '#EDE8DF',
    gap: 14,
  },

  coordPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(192,88,0,0.08)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coordText: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 12,
    color: '#C05800',
    letterSpacing: 0.3,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressIconWrap: {
    width: 24,
    marginTop: 1,
    alignItems: 'center',
  },
  addressText: {
    flex: 1,
    fontFamily: 'Oswald_400Regular',
    fontSize: 13,
    color: '#6B5540',
    lineHeight: 19,
  },

  fieldsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  labelRow: {
    gap: 6,
  },
  labelFieldLabel: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 10,
    color: '#A89070',
    letterSpacing: 1,
  },
  labelInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#D4C8A0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  labelInput: {
    flex: 1,
    fontFamily: 'Oswald_500Medium',
    fontSize: 15,
    color: '#1a1a1a',
  },

  officeDetailsInput: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#D4C8A0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Oswald_400Regular',
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 64,
  },

  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C05800',
    borderRadius: 14,
    height: 52,
    marginTop: 2,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
