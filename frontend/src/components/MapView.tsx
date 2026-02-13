import React from 'react';
import { View, StyleSheet } from 'react-native';
import NativeMapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
  grayscale?: boolean;
  style?: object;
};

export default function MapView({ latitude, longitude, grayscale, style }: Props) {
  return (
    <NativeMapView
      provider={PROVIDER_DEFAULT}
      style={[styles.map, style]}
      mapType="standard"
      region={{
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
    >
      {!grayscale && (
        <>
          {/* Outer pulse ring */}
          <Circle
            center={{ latitude, longitude }}
            radius={60}
            fillColor="rgba(34,197,94,0.15)"
            strokeColor="rgba(34,197,94,0.3)"
            strokeWidth={1}
          />
          {/* Inner dot */}
          <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerOuter}>
              <View style={styles.markerInner} />
            </View>
          </Marker>
        </>
      )}
    </NativeMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
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
