import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NativeMapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
  grayscale?: boolean;
  tilt?: boolean;
  avatarLabel?: string;
  style?: object;
};

// Renders the avatar bubble with 3 staggered radiating rings.
// Lives outside the main component so hooks are stable.
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
            duration: 1800,
            useNativeDriver: true,
          }),
          // reset instantly so the next loop starts cleanly
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = makeWave(ring1, 0);
    const a2 = makeWave(ring2, 600);
    const a3 = makeWave(ring3, 1200);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [ring1, ring2, ring3]);

  const ringAnimStyle = (anim: Animated.Value) => ({
    position: 'absolute' as const,
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.55)',
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.4],
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
      {/* Ring area — sized to contain the fully expanded rings */}
      <View style={styles.ringWrapper}>
        <Animated.View style={ringAnimStyle(ring1)} />
        <Animated.View style={ringAnimStyle(ring2)} />
        <Animated.View style={ringAnimStyle(ring3)} />
        {/* Avatar circle on top */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{label}</Text>
        </View>
      </View>
      {/* Tail */}
      <View style={styles.avatarTail} />
    </View>
  );
}

export default function MapView({ latitude, longitude, grayscale, tilt, avatarLabel, style }: Props) {
  return (
    <NativeMapView
      provider={PROVIDER_DEFAULT}
      style={[styles.map, style]}
      mapType="standard"
      camera={tilt ? {
        center: { latitude, longitude },
        pitch: 60,
        heading: 0,
        altitude: 500,
        zoom: 18,
      } : undefined}
      region={tilt ? undefined : {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
    >
      {!grayscale && (
        avatarLabel ? (
          <Marker
            coordinate={{ latitude, longitude }}
            anchor={{ x: 0.5, y: 1 }}
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
    // overflow visible so rings aren't clipped by the marker bounds
    overflow: 'visible',
  },
  // Contains the animated rings + avatar circle, centered
  ringWrapper: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarCircle: {
    position: 'absolute',
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
  avatarTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderLeftColor: 'transparent',
    borderRightWidth: 7,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: '#22c55e',
    marginTop: -1,
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
