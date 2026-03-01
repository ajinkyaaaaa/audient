import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import NativeMapView, {
  Marker,
  Polyline,
  Circle,
  PROVIDER_DEFAULT,
} from 'react-native-maps';

type Props = {
  clientLat: number;
  clientLng: number;
  userLat: number | null;
  userLng: number | null;
  style?: object;
};

export default function ClientLocationMap({ clientLat, clientLng, userLat, userLng, style }: Props) {
  const mapRef = useRef<any>(null);

  const hasUser = userLat !== null && userLng !== null;

  // Auto-fit to show both markers once the map is ready
  useEffect(() => {
    if (!hasUser) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: userLat!, longitude: userLng! },
          { latitude: clientLat, longitude: clientLng },
        ],
        {
          edgePadding: { top: 52, right: 52, bottom: 52, left: 52 },
          animated: true,
        }
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [clientLat, clientLng, userLat, userLng, hasUser]);

  const initialRegion = hasUser
    ? {
        // Centre between the two points
        latitude: (userLat! + clientLat) / 2,
        longitude: (userLng! + clientLng) / 2,
        latitudeDelta: Math.abs(userLat! - clientLat) * 2.5 + 0.02,
        longitudeDelta: Math.abs(userLng! - clientLng) * 2.5 + 0.02,
      }
    : {
        latitude: clientLat,
        longitude: clientLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  return (
    <NativeMapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={[styles.map, style]}
      mapType="standard"
      initialRegion={initialRegion}
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {/* Client office marker — orange */}
      <Marker
        coordinate={{ latitude: clientLat, longitude: clientLng }}
        pinColor="#C05800"
        anchor={{ x: 0.5, y: 1 }}
      />

      {/* User location — green dot with pulse circle */}
      {hasUser && (
        <>
          <Circle
            center={{ latitude: userLat!, longitude: userLng! }}
            radius={80}
            fillColor="rgba(34,197,94,0.15)"
            strokeColor="rgba(34,197,94,0.35)"
            strokeWidth={1}
          />
          <Marker coordinate={{ latitude: userLat!, longitude: userLng! }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
          {/* Dashed route polyline */}
          <Polyline
            coordinates={[
              { latitude: userLat!, longitude: userLng! },
              { latitude: clientLat, longitude: clientLng },
            ]}
            strokeColor="#C05800"
            strokeWidth={2.5}
            lineDashPattern={[8, 12]}
          />
        </>
      )}
    </NativeMapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  userDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(34,197,94,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDotInner: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
});
