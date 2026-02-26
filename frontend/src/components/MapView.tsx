import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NativeMapView, { Marker, Circle, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
  grayscale?: boolean;
  tilt?: boolean;
  avatarLabel?: string;
  style?: object;
  showWeather?: boolean;
  recenterKey?: number;
};

// Renders the avatar bubble: avatar above the dot, rings radiating from the dot.
// Lives outside the main component so hooks are stable.
//
// Layout (px):
//   avatarCircle : 46 h
//   gap          :  4 h  (marginTop on dotArea)
//   dot          : 12 h  → dot center at y = 46 + 4 + 6 = 56
//   total height : 62
//   Marker anchor: { x: 0.5, y: 56/62 } → dot center = map coordinate ✓
function AvatarBubble({ label }: { label: string }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeWave = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = makeWave(ring1, 0);
    const a2 = makeWave(ring2, 650);
    const a3 = makeWave(ring3, 1300);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [ring1, ring2, ring3]);

  // Rings start at dot size (12px) and scale out to ~3.5× (~42px)
  const ringAnimStyle = (anim: Animated.Value) => ({
    position: 'absolute' as const,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.7)',
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 3.5],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 0.7, 0],
    }),
  });

  return (
    <View style={styles.avatarContainer}>
      {/* Avatar circle floating above the dot */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitials}>{label}</Text>
      </View>
      {/* Green dot at map coordinate with radiating rings */}
      <View style={styles.dotArea}>
        <Animated.View style={ringAnimStyle(ring1)} />
        <Animated.View style={ringAnimStyle(ring2)} />
        <Animated.View style={ringAnimStyle(ring3)} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

export default function MapView({ latitude, longitude, grayscale, tilt, avatarLabel, style, showWeather, recenterKey }: Props) {
  const mapRef = useRef<any>(null);
  const latRef = useRef(latitude);
  const lonRef = useRef(longitude);
  const [radarUrl, setRadarUrl] = useState<string | null>(null);
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);

  // Capture the initial camera once — never update this ref so the map
  // doesn't re-fly every time the GPS position prop changes.
  const initialCameraRef = useRef(tilt ? {
    center: { latitude, longitude },
    pitch: 60,
    heading: 0,
    zoom: 17,
  } : undefined);

  // Keep coordinate refs fresh so re-center always uses the latest GPS fix.
  useEffect(() => {
    latRef.current = latitude;
    lonRef.current = longitude;
  }, [latitude, longitude]);

  // Re-center map when recenterKey changes (skip initial 0).
  useEffect(() => {
    if (!recenterKey) return;
    mapRef.current?.animateCamera(
      { center: { latitude: latRef.current, longitude: lonRef.current }, pitch: 60, heading: 0, zoom: 17 },
      { duration: 600 }
    );
  }, [recenterKey]);

  // Fetch RainViewer radar + satellite infrared when weather overlay is toggled.
  // Satellite infrared = cloud cover (always visible, not just when raining).
  // Radar = precipitation (coloured only where active rain/snow exists).
  useEffect(() => {
    if (!showWeather) { setRadarUrl(null); setSatelliteUrl(null); return; }
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json())
      .then(data => {
        if (data.radar?.past?.length) {
          const path = data.radar.past[data.radar.past.length - 1].path;
          setRadarUrl(`https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/2/1_1.png`);
        }
        if (data.satellite?.infrared?.length) {
          const satPath = data.satellite.infrared[data.satellite.infrared.length - 1].path;
          setSatelliteUrl(`https://tilecache.rainviewer.com${satPath}/256/{z}/{x}/{y}/0/0_0.png`);
        }
      })
      .catch(() => {});
  }, [showWeather]);

  return (
    <NativeMapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={[styles.map, style]}
      mapType="standard"
      initialCamera={initialCameraRef.current}
      region={tilt ? undefined : {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
    >
      {/* Satellite infrared — cloud cover, always visible when weather is on */}
      {satelliteUrl && (
        <UrlTile urlTemplate={satelliteUrl} opacity={0.4} tileSize={256} zIndex={1} />
      )}
      {/* Precipitation radar — coloured only where rain/snow is active */}
      {radarUrl && (
        <UrlTile urlTemplate={radarUrl} opacity={0.7} tileSize={256} zIndex={2} />
      )}
      {!grayscale && (
        avatarLabel ? (
          <Marker
            coordinate={{ latitude, longitude }}
            anchor={{ x: 0.5, y: 56 / 62 }}
            tracksViewChanges={false}
          >
            <AvatarBubble label={avatarLabel} />
          </Marker>
        ) : (
          <>
            <Circle
              center={{ latitude, longitude }}
              radius={60}
              fillColor="rgba(34,197,94,0.15)"
              strokeColor="rgba(34,197,94,0.3)"
              strokeWidth={1}
            />
            <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerOuter}>
                <View style={styles.markerInner} />
              </View>
            </Marker>
          </>
        )
      )}
    </NativeMapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },

  // Avatar bubble
  avatarContainer: {
    alignItems: 'center',
    overflow: 'visible',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2d4a3e',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Dot area: 12×12, 4px below the avatar — rings are absolute inside, overflow visible
  dotArea: {
    marginTop: 4,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },

  // Standard GPS dot (Geo-Sense)
  markerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
});
