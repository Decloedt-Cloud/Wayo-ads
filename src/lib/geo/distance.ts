export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeoTarget {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export function calculateHaversineDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371;
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function isCreatorEligibleForCampaign(
  creatorLocation: Coordinates | null,
  campaignTarget: GeoTarget | null
): boolean {
  if (!campaignTarget) {
    return true;
  }

  if (!creatorLocation) {
    return false;
  }

  const distance = calculateHaversineDistance(creatorLocation, {
    latitude: campaignTarget.latitude,
    longitude: campaignTarget.longitude,
  });

  return distance <= campaignTarget.radiusKm;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function getTargetingSummary(
  city: string | null,
  countryCode: string | null,
  radiusKm: number | null
): string | null {
  if (!city || !countryCode || !radiusKm) {
    return null;
  }
  return `${city}, ${countryCode} + ${radiusKm} km`;
}

export const MAJOR_CITIES: Array<{
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}> = [
  { name: 'Casablanca', country: 'Morocco', countryCode: 'MA', latitude: 33.5731, longitude: -7.5898 },
  { name: 'Rabat', country: 'Morocco', countryCode: 'MA', latitude: 34.0209, longitude: -6.8416 },
  { name: 'Marrakech', country: 'Morocco', countryCode: 'MA', latitude: 31.6295, longitude: -7.9811 },
  { name: 'Fes', country: 'Morocco', countryCode: 'MA', latitude: 34.0181, longitude: -5.0078 },
  { name: 'Tangier', country: 'Morocco', countryCode: 'MA', latitude: 35.7595, longitude: -5.8340 },
  { name: 'Agadir', country: 'Morocco', countryCode: 'MA', latitude: 30.4278, longitude: -9.5982 },
  { name: 'Meknes', country: 'Morocco', countryCode: 'MA', latitude: 33.8938, longitude: -5.5473 },
  { name: 'London', country: 'United Kingdom', countryCode: 'GB', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Paris', country: 'France', countryCode: 'FR', latitude: 48.8566, longitude: 2.3522 },
  { name: 'Berlin', country: 'Germany', countryCode: 'DE', latitude: 52.5200, longitude: 13.4050 },
  { name: 'Madrid', country: 'Spain', countryCode: 'ES', latitude: 40.4168, longitude: -3.7038 },
  { name: 'Rome', country: 'Italy', countryCode: 'IT', latitude: 41.9028, longitude: 12.4964 },
  { name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', latitude: 52.3676, longitude: 4.9041 },
  { name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', latitude: 25.2048, longitude: 55.2708 },
  { name: 'New York', country: 'United States', countryCode: 'US', latitude: 40.7128, longitude: -74.0060 },
  { name: 'Los Angeles', country: 'United States', countryCode: 'US', latitude: 34.0522, longitude: -118.2437 },
  { name: 'Miami', country: 'United States', countryCode: 'US', latitude: 25.7617, longitude: -80.1918 },
  { name: 'Toronto', country: 'Canada', countryCode: 'CA', latitude: 43.6532, longitude: -79.3832 },
  { name: 'Montreal', country: 'Canada', countryCode: 'CA', latitude: 45.5017, longitude: -73.5673 },
  { name: 'Algiers', country: 'Algeria', countryCode: 'DZ', latitude: 36.7538, longitude: 3.0588 },
  { name: 'Tunis', country: 'Tunisia', countryCode: 'TN', latitude: 36.8065, longitude: 10.1815 },
];
