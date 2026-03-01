import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

type Props = {
  clientLat: number;
  clientLng: number;
  userLat: number | null;
  userLng: number | null;
  style?: object;
};

// ── Map content: markers + polyline + auto-fit (must live inside MapContainer) ──

function MapContent({ clientLat, clientLng, userLat, userLng }: Omit<Props, 'style'>) {
  const map = useMap();

  useEffect(() => {
    const L = (window as any).L;
    if (!L) return;

    const layers: any[] = [];

    // ── Client office pin (orange drop-pin) ──────────────────────────────────
    const clientIcon = L.divIcon({
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
            position:absolute;top:28px;left:12px;
            width:8px;height:5px;
            background:rgba(0,0,0,0.18);
            border-radius:50%;
          "></div>
        </div>
      `,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
    });
    layers.push(L.marker([clientLat, clientLng], { icon: clientIcon }).addTo(map));

    if (userLat !== null && userLng !== null) {
      // ── User's live location (pulsating green dot) ──────────────────────────
      const userIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:40px;height:40px;">
            <div style="
              position:absolute;top:50%;left:50%;
              width:32px;height:32px;
              margin:-16px 0 0 -16px;
              background:rgba(34,197,94,0.2);
              border-radius:50%;
              animation:gps-pulse 2s ease-out infinite;
              z-index:1;
            "></div>
            <div style="
              position:absolute;top:50%;left:50%;
              width:14px;height:14px;
              margin:-7px 0 0 -7px;
              background:#22c55e;
              border:2.5px solid #fff;
              border-radius:50%;
              box-shadow:0 0 8px rgba(34,197,94,0.8);
              z-index:3;
            "></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      layers.push(L.marker([userLat, userLng], { icon: userIcon }).addTo(map));

      // ── Dashed route line ────────────────────────────────────────────────────
      const line = L.polyline(
        [[userLat, userLng], [clientLat, clientLng]],
        {
          color: '#C05800',
          weight: 3,
          dashArray: '8 12',
          opacity: 0.7,
          lineCap: 'round',
        }
      ).addTo(map);
      layers.push(line);

      // Auto-fit to show both points with padding
      const bounds = L.latLngBounds(
        [[userLat, userLng], [clientLat, clientLng]]
      );
      map.fitBounds(bounds, { padding: [52, 52], maxZoom: 16 });
    } else {
      map.setView([clientLat, clientLng], 15);
    }

    return () => {
      layers.forEach((l) => map.removeLayer(l));
    };
  }, [clientLat, clientLng, userLat, userLng, map]);

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientLocationMap({ clientLat, clientLng, userLat, userLng, style }: Props) {
  useEffect(() => {
    // Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // Pulsating animation (reuse the same id as MapView.web.tsx if already injected)
    if (!document.getElementById('gps-pulse-animation')) {
      const el = document.createElement('style');
      el.id = 'gps-pulse-animation';
      el.textContent = `
        @keyframes gps-pulse {
          0%   { transform: scale(0.3); opacity: 1; }
          70%  { transform: scale(1);   opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
      `;
      document.head.appendChild(el);
    }
  }, []);

  return (
    <View style={[styles.container, style]}>
      <MapContainer
        center={[clientLat, clientLng]}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <MapContent
          clientLat={clientLat}
          clientLng={clientLng}
          userLat={userLat}
          userLng={userLng}
        />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 0,
  },
});
