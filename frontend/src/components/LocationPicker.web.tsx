import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { Ionicons } from '@expo/vector-icons';

// ── Types ────────────────────────────────────────────────────────────────────

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
};

type Props = {
  latitude: number | null;
  longitude: number | null;
  onLocationPicked: (lat: number, lng: number) => void;
  style?: object;
};

type FlyConfig = { lat: number; lng: number; zoom: number; key: number } | null;

const DEFAULT_CENTER: [number, number] = [19.076, 72.877]; // Mumbai

// ── Map child components ─────────────────────────────────────────────────────

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function PinMarker({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const markerRef = useRef<any>(null);

  // Create marker once on mount
  useEffect(() => {
    const L = (window as any).L;
    if (!L) return;

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:32px;height:44px;">
          <div style="
            position:absolute;top:0;left:4px;
            width:24px;height:24px;
            background:#C05800;
            border:3px solid #FFFFFF;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 4px 14px rgba(192,88,0,0.5);
          "></div>
          <div style="
            position:absolute;top:29px;left:12px;
            width:8px;height:5px;
            background:rgba(0,0,0,0.18);
            border-radius:50%;
          "></div>
        </div>
      `,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
    });

    const marker = L.marker(position, { icon, draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      onChange(ll.lat, ll.lng);
    });

    return () => {
      map.removeLayer(marker);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when parent position changes (from click or search)
  useEffect(() => {
    markerRef.current?.setLatLng(position);
  }, [position]);

  return null;
}

function MapFlyController({ flyConfig }: { flyConfig: FlyConfig }) {
  const map = useMap();
  const lastKey = useRef<number | null>(null);

  useEffect(() => {
    if (!flyConfig || flyConfig.key === lastKey.current) return;
    lastKey.current = flyConfig.key;
    map.flyTo([flyConfig.lat, flyConfig.lng], flyConfig.zoom, { duration: 1.0 });
  }, [flyConfig, map]);

  return null;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function LocationPicker({ latitude, longitude, onLocationPicked, style }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [flyConfig, setFlyConfig] = useState<FlyConfig>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const searchTimer = useRef<any>(null);

  // Inject Leaflet CSS + crosshair cursor once
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('picker-styles')) {
      const el = document.createElement('style');
      el.id = 'picker-styles';
      el.textContent = `.picker-map { cursor: crosshair !important; } .leaflet-control-zoom { display: none; }`;
      document.head.appendChild(el);
    }
  }, []);

  // Nominatim search with 350ms debounce
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
    // Set short display name in search box
    const parts = r.display_name.split(', ');
    setQuery(parts.slice(0, 3).join(', '));
    setResults([]);
    setInputFocused(false);
    onLocationPicked(lat, lng);
    setFlyConfig({ lat, lng, zoom: 17, key: Date.now() });
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyConfig({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          zoom: 17,
          key: Date.now(),
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    clearTimeout(searchTimer.current);
  };

  const hasPin = latitude !== null && longitude !== null;
  const center: [number, number] = hasPin ? [latitude!, longitude!] : DEFAULT_CENTER;
  const showResults = inputFocused && results.length > 0;

  return (
    // Outer: provides relative positioning context — NO overflow:hidden so dropdown isn't clipped
    <View style={[styles.outer, style]}>

      {/* Map layer — clipped to rounded corners with its own overflow:hidden */}
      <View style={styles.mapClip}>
        <MapContainer
          center={center}
          zoom={hasPin ? 15 : 11}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
          zoomControl={false}
          className="picker-map"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <ClickHandler onPick={onLocationPicked} />
          <MapFlyController flyConfig={flyConfig} />
          {hasPin && (
            <PinMarker
              position={[latitude!, longitude!]}
              onChange={onLocationPicked}
            />
          )}
        </MapContainer>

        {/* Leaflet attribution — we hide the default one, add our own */}
        <View style={styles.attribution} pointerEvents="none">
          <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
        </View>
      </View>

      {/* ── Search bar ────────────────────────────────────────────────── */}
      <View style={styles.searchOverlay}>
        <View style={[styles.searchBar, inputFocused && styles.searchBarFocused]}>
          <View style={styles.searchIconWrap}>
            {searching ? (
              <ActivityIndicator size="small" color="#C05800" />
            ) : (
              <Ionicons name="search" size={17} color={inputFocused ? '#C05800' : '#A89070'} />
            )}
          </View>

          <TextInput
            style={styles.searchInput as any}
            placeholder="Search city, address, landmark…"
            placeholderTextColor="#B0A898"
            value={query}
            onChangeText={(t) => { setQuery(t); runSearch(t); }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 180)}
          />

          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={17} color="#B0A898" />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestion dropdown */}
        {showResults && (
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

      {/* ── My Location button ────────────────────────────────────────── */}
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

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Outer wrapper — no overflow so dropdown isn't clipped
  outer: {
    flex: 1,
    position: 'relative',
    borderRadius: 16,
  },

  // Map gets its own clipping layer
  mapClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },

  attribution: {
    position: 'absolute',
    bottom: 4,
    left: 6,
  },
  attributionText: {
    fontSize: 9,
    color: 'rgba(0,0,0,0.35)',
    fontFamily: 'Oswald_400Regular',
  },

  // Search overlay — positioned above the map layer
  searchOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 1000,
  } as any,

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
  searchBarFocused: {
    borderColor: '#C05800',
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
    outline: 'none',
    height: '100%',
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

  // My Location button
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
    zIndex: 999,
  } as any,
});
