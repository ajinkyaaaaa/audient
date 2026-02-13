import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, useMap, CircleMarker } from 'react-leaflet';

type Props = {
  latitude: number;
  longitude: number;
  grayscale?: boolean;
  style?: object;
};

function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);
  return null;
}

function PulsatingMarker({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    // Create the pulsating GPS marker using a custom CSS div
    const pulseIcon = (window as any).L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:40px;height:40px;">
          <div style="
            position:absolute;top:50%;left:50%;
            width:14px;height:14px;
            margin:-7px 0 0 -7px;
            background:#22c55e;
            border:2.5px solid #fff;
            border-radius:50%;
            box-shadow:0 0 6px rgba(34,197,94,0.6);
            z-index:2;
          "></div>
          <div style="
            position:absolute;top:50%;left:50%;
            width:40px;height:40px;
            margin:-20px 0 0 -20px;
            background:rgba(34,197,94,0.25);
            border-radius:50%;
            animation:gps-pulse 2s ease-out infinite;
            z-index:1;
          "></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = (window as any).L.marker([latitude, longitude], { icon: pulseIcon }).addTo(map);

    return () => {
      map.removeLayer(marker);
    };
  }, [latitude, longitude, map]);

  return null;
}

export default function MapView({ latitude, longitude, grayscale, style }: Props) {
  // Inject Leaflet CSS + pulse animation
  useEffect(() => {
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const animId = 'gps-pulse-animation';
    if (!document.getElementById(animId)) {
      const styleEl = document.createElement('style');
      styleEl.id = animId;
      styleEl.textContent = `
        @keyframes gps-pulse {
          0% { transform: scale(0.3); opacity: 1; }
          70% { transform: scale(1); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  return (
    <View style={[styles.container, style, grayscale && styles.grayscale]}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater latitude={latitude} longitude={longitude} />
        {!grayscale && (
          <PulsatingMarker latitude={latitude} longitude={longitude} />
        )}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
  grayscale: {
    // @ts-ignore — web-only CSS filter
    filter: 'grayscale(100%)',
  },
});
