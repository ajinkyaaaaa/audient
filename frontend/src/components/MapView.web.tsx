import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

type Props = {
  latitude: number;
  longitude: number;
  grayscale?: boolean;
  tilt?: boolean;
  avatarLabel?: string;
  style?: object;
};

function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);
  return null;
}

function PulsatingMarker({
  latitude,
  longitude,
  large,
}: {
  latitude: number;
  longitude: number;
  large?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const size = large ? 80 : 40;
    const dotSize = large ? 20 : 14;
    const ringSize = large ? 70 : 40;
    const midRing = large ? 44 : 0;
    const glow = large
      ? '0 0 14px rgba(0,255,136,0.95), 0 0 28px rgba(0,255,136,0.45)'
      : '0 0 8px rgba(34,197,94,0.8)';
    const dotColor = large ? '#00ff88' : '#22c55e';
    const ringColor = large ? 'rgba(0,255,136,' : 'rgba(34,197,94,';

    const midRingHtml = large
      ? `<div style="
          position:absolute;top:50%;left:50%;
          width:${midRing}px;height:${midRing}px;
          margin:-${midRing / 2}px 0 0 -${midRing / 2}px;
          background:${ringColor}0.15);
          border-radius:50%;
          animation:gps-pulse 2.5s ease-out infinite 0.5s;
          z-index:2;
        "></div>`
      : '';

    const pulseIcon = (window as any).L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:${size}px;height:${size}px;">
          <div style="
            position:absolute;top:50%;left:50%;
            width:${ringSize}px;height:${ringSize}px;
            margin:-${ringSize / 2}px 0 0 -${ringSize / 2}px;
            background:${ringColor}${large ? '0.08' : '0.25'});
            ${large ? `border:1px solid ${ringColor}0.2);` : ''}
            border-radius:50%;
            animation:gps-pulse ${large ? '2.5' : '2'}s ease-out infinite;
            z-index:1;
          "></div>
          ${midRingHtml}
          <div style="
            position:absolute;top:50%;left:50%;
            width:${dotSize}px;height:${dotSize}px;
            margin:-${dotSize / 2}px 0 0 -${dotSize / 2}px;
            background:${dotColor};
            border:${large ? 3 : 2.5}px solid #fff;
            border-radius:50%;
            box-shadow:${glow};
            z-index:3;
          "></div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    const marker = (window as any).L.marker([latitude, longitude], { icon: pulseIcon }).addTo(map);
    return () => { map.removeLayer(marker); };
  }, [latitude, longitude, map, large]);

  return null;
}

function AvatarMarker({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const map = useMap();

  useEffect(() => {
    // Container: 120px wide, 120px tall + 10px tail = 130px total
    // Avatar centre sits at (60, 60) inside the container.
    // Three rings all start at 54px and expand to ~113px (scale 2.1), fitting in 120px.
    // iconAnchor [60, 130] = tip of the tail sits exactly on the coordinate.
    const avatarIcon = (window as any).L.divIcon({
      className: '',
      html: `
        <div style="
          width:120px;height:130px;
          position:relative;
        ">
          <!-- Radiating wave ring 1 (delay 0s) -->
          <div style="
            position:absolute;top:33px;left:33px;
            width:54px;height:54px;border-radius:50%;
            border:1.5px solid rgba(34,197,94,0.6);
            animation:radar-wave 1.8s ease-out infinite 0s;
          "></div>

          <!-- Radiating wave ring 2 (delay 0.6s) -->
          <div style="
            position:absolute;top:33px;left:33px;
            width:54px;height:54px;border-radius:50%;
            border:1.5px solid rgba(34,197,94,0.6);
            animation:radar-wave 1.8s ease-out infinite 0.6s;
          "></div>

          <!-- Radiating wave ring 3 (delay 1.2s) -->
          <div style="
            position:absolute;top:33px;left:33px;
            width:54px;height:54px;border-radius:50%;
            border:1.5px solid rgba(34,197,94,0.6);
            animation:radar-wave 1.8s ease-out infinite 1.2s;
          "></div>

          <!-- Avatar circle -->
          <div style="
            position:absolute;top:37px;left:37px;
            width:46px;height:46px;border-radius:50%;
            background:#2d4a3e;
            border:3px solid #ffffff;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 4px 18px rgba(0,0,0,0.55);
            z-index:4;
            color:#ffffff;
            font-size:16px;font-weight:700;
            font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
            letter-spacing:0.5px;
          ">${label}</div>

          <!-- Downward triangle tail -->
          <div style="
            position:absolute;bottom:0;left:50%;
            margin-left:-7px;
            width:0;height:0;
            border-left:7px solid transparent;
            border-right:7px solid transparent;
            border-top:10px solid #22c55e;
            z-index:5;
            filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));
          "></div>
        </div>
      `,
      iconSize: [120, 130],
      iconAnchor: [60, 130],
    });

    const marker = (window as any).L.marker([latitude, longitude], { icon: avatarIcon }).addTo(map);
    return () => { map.removeLayer(marker); };
  }, [latitude, longitude, map, label]);

  return null;
}

export default function MapView({ latitude, longitude, grayscale, tilt, avatarLabel, style }: Props) {
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
          0%   { transform: scale(0.3); opacity: 1; }
          70%  { transform: scale(1);   opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
        @keyframes radar-wave {
          0%   { transform: scale(1);   opacity: 0.65; }
          100% { transform: scale(2.1); opacity: 0; }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  // ── Tilt: navigation-style 3D perspective ─────────────────────────────────
  // rotateX(-50deg)      top recedes to horizon, bottom stays close (nav-app direction)
  // perspective(520px)   short focal length → pronounced 3D depth
  // transformOrigin 72%  pivot near bottom-third so user's location stays stable
  // scale(2.1)           covers background revealed by the aggressive tilt
  // CSS filter           game-map look: boosted saturation, slightly darker, warm tint
  const tiltDivStyle: React.CSSProperties = tilt
    ? {
        width: '100%',
        height: '130%',
        marginTop: '-15%',
        transform: 'perspective(520px) rotateX(-50deg) scale(2.1)',
        transformOrigin: '50% 72%',
        overflow: 'hidden',
        filter: 'saturate(1.35) contrast(1.1) brightness(0.8) hue-rotate(-8deg)',
      }
    : { width: '100%', height: '100%' };

  // ── Vignette overlay (screen-space, not transformed with the map) ─────────
  const vignetteStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(ellipse at 50% 58%, transparent 28%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.82) 100%)',
    pointerEvents: 'none',
    zIndex: 500,
  };

  // ── Tile layers ────────────────────────────────────────────────────────────
  // Tilt (home): CartoDB Dark Matter — matches dark UI
  // Normal (Geo-Sense): CartoDB Voyager — clean navigation tiles
  const tileUrl = tilt
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <View style={[styles.container, style, grayscale && styles.grayscale]}>
      {/* 3D tilted map */}
      <div style={tiltDivStyle}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={tilt ? 17 : 16}
          style={{ width: '100%', height: '100%' }}
          zoomControl={!tilt}
          attributionControl={false}
          dragging={!tilt}
          scrollWheelZoom={!tilt}
          doubleClickZoom={!tilt}
          touchZoom={!tilt}
          boxZoom={!tilt}
          keyboard={!tilt}
        >
          <TileLayer url={tileUrl} />
          <MapUpdater latitude={latitude} longitude={longitude} />
          {!grayscale && (
            avatarLabel
              ? <AvatarMarker latitude={latitude} longitude={longitude} label={avatarLabel} />
              : <PulsatingMarker latitude={latitude} longitude={longitude} large={tilt} />
          )}
        </MapContainer>
      </div>

      {/* Screen-space vignette: sits flat above the tilted map */}
      {tilt && <div style={vignetteStyle} />}
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
