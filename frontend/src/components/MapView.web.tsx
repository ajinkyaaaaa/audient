import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

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
    // Layout (all measurements in px):
    //   Container  : 80 wide × 68 tall
    //   Avatar (44px): top:0, left:18  → center (40, 22), bottom at y=44
    //   Gap          : 4px             → dot top at y=48
    //   Dot (12px)   : top:48, left:34 → center (40, 54)
    //   Rings (40px) : centered at dot (40, 54) → top:34, left:20
    //   iconAnchor   : [40, 54]        → dot center = map coordinate ✓
    const avatarIcon = (window as any).L.divIcon({
      className: '',
      html: `
        <div style="
          width:80px;height:68px;
          position:relative;
          overflow:visible;
        ">
          <!-- Avatar circle floating above dot -->
          <div style="
            position:absolute;top:0;left:18px;
            width:44px;height:44px;border-radius:50%;
            background:#2d4a3e;
            border:3px solid #ffffff;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 4px 14px rgba(0,0,0,0.45);
            z-index:4;
            color:#ffffff;
            font-size:15px;font-weight:700;
            font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
            letter-spacing:0.5px;
          ">${label}</div>

          <!-- Radiating wave ring 1 (delay 0s) -->
          <div style="
            position:absolute;top:34px;left:20px;
            width:40px;height:40px;border-radius:50%;
            border:1.5px solid rgba(34,197,94,0.7);
            animation:radar-wave 2s ease-out infinite 0s;
            z-index:1;
          "></div>

          <!-- Radiating wave ring 2 (delay 0.65s) -->
          <div style="
            position:absolute;top:34px;left:20px;
            width:40px;height:40px;border-radius:50%;
            border:1.5px solid rgba(34,197,94,0.7);
            animation:radar-wave 2s ease-out infinite 0.65s;
            z-index:1;
          "></div>

          <!-- Radiating wave ring 3 (delay 1.3s) -->
          <div style="
            position:absolute;top:34px;left:20px;
            width:40px;height:40px;border-radius:50%;
            border:1.5px solid rgba(34,197,94,0.7);
            animation:radar-wave 2s ease-out infinite 1.3s;
            z-index:1;
          "></div>

          <!-- Green dot at map coordinate -->
          <div style="
            position:absolute;top:48px;left:34px;
            width:12px;height:12px;border-radius:50%;
            background:#22c55e;
            border:2.5px solid #ffffff;
            box-shadow:0 0 8px rgba(34,197,94,0.9);
            z-index:3;
          "></div>
        </div>
      `,
      iconSize: [80, 68],
      iconAnchor: [40, 54],
    });

    const marker = (window as any).L.marker([latitude, longitude], { icon: avatarIcon }).addTo(map);
    return () => { map.removeLayer(marker); };
  }, [latitude, longitude, map, label]);

  return null;
}

function WeatherLayer() {
  const [radarUrl, setRadarUrl] = useState<string | null>(null);
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <>
      {satelliteUrl && <TileLayer url={satelliteUrl} opacity={0.4} />}
      {radarUrl && <TileLayer url={radarUrl} opacity={0.7} />}
    </>
  );
}

function MapRecenterer({ latitude, longitude, recenterKey }: { latitude: number; longitude: number; recenterKey: number }) {
  const map = useMap();

  useEffect(() => {
    if (!recenterKey) return;
    map.flyTo([latitude, longitude], 17);
  }, [recenterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function MapView({ latitude, longitude, grayscale, tilt, avatarLabel, style, showWeather, recenterKey = 0 }: Props) {
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
          {/* Only auto-follow GPS in normal (Geo-Sense) mode; tilt uses re-center button */}
          {!tilt && <MapUpdater latitude={latitude} longitude={longitude} />}
          {showWeather && <WeatherLayer />}
          <MapRecenterer latitude={latitude} longitude={longitude} recenterKey={recenterKey} />
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
