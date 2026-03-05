import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import NativeMapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// ── Types ─────────────────────────────────────────────────────────────────────

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  latitude: number | null;
  longitude: number | null;
  onLocationPicked: (lat: number, lng: number) => void;
  style?: object;
};

const DEFAULT_REGION = {
  latitude: 19.076,
  longitude: 72.877,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LocationPicker({ latitude, longitude, onLocationPicked, style }: Props) {
  const mapRef = useRef<any>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimer = useRef<any>(null);

  const hasPin = latitude !== null && longitude !== null;

  // ── Center on current position on mount (when no initial pin) ─────────────
  useEffect(() => {
    if (hasPin) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          600
        );
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Nominatim search ────────────────────────────────────────────────────────

  const runSearch = useCallback((text: string) => {
    clearTimeout(searchTimer.current);
    if (!text.trim() || text.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(text)}&format=json&limit=7&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const handleSelectResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const parts = r.display_name.split(', ');
    setQuery(parts.slice(0, 3).join(', '));
    setResults([]);
    setShowResults(false);
    onLocationPicked(lat, lng);
    // Animate map to the selected location
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      900
    );
  };

  // ── My Location ─────────────────────────────────────────────────────────────

  const handleMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = loc.coords;
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
        900
      );
    } finally {
      setLocating(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, style]}>
      {/* Map */}
      <NativeMapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        mapType="standard"
        region={
          hasPin
            ? {
                latitude: latitude!,
                longitude: longitude!,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : DEFAULT_REGION
        }
        onPress={(e) => {
          const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
          onLocationPicked(lat, lng);
        }}
        showsUserLocation
        followsUserLocation={!hasPin}
        showsMyLocationButton={false}
      >
        {hasPin && (
          <Marker
            coordinate={{ latitude: latitude!, longitude: longitude! }}
            draggable
            pinColor="#C05800"
            onDragEnd={(e) => {
              const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
              onLocationPicked(lat, lng);
            }}
          />
        )}
      </NativeMapView>

      {/* ── Search bar overlay ────────────────────────────────────────────── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconWrap}>
            {searching ? (
              <ActivityIndicator size="small" color="#C05800" />
            ) : (
              <Ionicons name="search" size={17} color="#A89070" />
            )}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, address, landmark…"
            placeholderTextColor="#B0A898"
            value={query}
            onChangeText={(t) => { setQuery(t); runSearch(t); }}
            onFocus={() => setShowResults(results.length > 0)}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => { setQuery(''); setResults([]); setShowResults(false); }}
              style={styles.clearBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={17} color="#B0A898" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown */}
        {showResults && results.length > 0 && (
          <View style={styles.dropdown}>
            {results.map((r, idx) => {
              const parts = r.display_name.split(', ');
              const primary = parts.slice(0, 2).join(', ');
              const secondary = parts.slice(2, 5).join(', ');
              const isLast = idx === results.length - 1;
              return (
                <TouchableOpacity
                  key={r.place_id}
                  style={[styles.dropdownRow, isLast && styles.dropdownRowLast]}
                  onPress={() => handleSelectResult(r)}
                  activeOpacity={0.72}
                >
                  <View style={styles.dropdownPin}>
                    <Ionicons name="location" size={14} color="#C05800" />
                  </View>
                  <View style={styles.dropdownText}>
                    <Text style={styles.dropdownPrimary} numberOfLines={1}>{primary}</Text>
                    {!!secondary && (
                      <Text style={styles.dropdownSecondary} numberOfLines={1}>{secondary}</Text>
                    )}
                  </View>
                  <Ionicons name="arrow-forward-outline" size={12} color="#C4B49A" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── My Location button ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.locateBtn}
        onPress={handleMyLocation}
        activeOpacity={0.8}
      >
        {locating ? (
          <ActivityIndicator size="small" color="#C05800" />
        ) : (
          <Ionicons name="locate" size={20} color="#C05800" />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },

  // Search
  searchWrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EDE8DF',
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
  },
  searchIconWrap: {
    width: 24,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#1a1a1a',
  },
  clearBtn: {
    padding: 2,
  },

  // Dropdown
  dropdown: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE8DF',
    overflow: 'hidden',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F4EF',
    gap: 10,
  },
  dropdownRowLast: {
    borderBottomWidth: 0,
  },
  dropdownPin: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(192,88,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownText: {
    flex: 1,
  },
  dropdownPrimary: {
    fontSize: 13,
    fontFamily: 'Oswald_500Medium',
    color: '#1a1a1a',
  },
  dropdownSecondary: {
    fontSize: 11,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    marginTop: 2,
  },

  // My Location
  locateBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EDE8DF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
});
