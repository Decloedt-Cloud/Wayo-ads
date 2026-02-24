'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GeoRadiusMapProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  cityName?: string;
  className?: string;
}

function MapUpdater({
  latitude,
  longitude,
  radiusKm,
}: {
  latitude: number;
  longitude: number;
  radiusKm: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], calculateZoomLevel(radiusKm));
  }, [map, latitude, longitude, radiusKm]);

  return null;
}

function calculateZoomLevel(radiusKm: number): number {
  if (radiusKm <= 10) return 13;
  if (radiusKm <= 25) return 11;
  if (radiusKm <= 50) return 10;
  if (radiusKm <= 100) return 8;
  if (radiusKm <= 200) return 7;
  if (radiusKm <= 500) return 5;
  return 4;
}

export function GeoRadiusMap({
  latitude,
  longitude,
  radiusKm,
  className = 'h-64 w-full rounded-lg',
}: GeoRadiusMapProps) {
  const defaultCenter: [number, number] = [latitude, longitude];

  return (
    <div className={className}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <MapContainer
        center={defaultCenter}
        zoom={calculateZoomLevel(radiusKm)}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Circle
          center={defaultCenter}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.2,
            weight: 2,
          }}
        />
        <MapUpdater
          latitude={latitude}
          longitude={longitude}
          radiusKm={radiusKm}
        />
      </MapContainer>
    </div>
  );
}
