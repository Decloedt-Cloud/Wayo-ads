'use client';

import { useState } from 'react';
import { CitySearch, CityOption } from '@/components/city-search/CitySearch';
import { RadiusSlider } from '@/components/slider/RadiusSlider';
import { GeoRadiusMap } from '@/components/maps/GeoRadiusMap';
import { Switch } from '@/components/ui/switch';
import { MapPin, Globe, AlertCircle, Check } from 'lucide-react';
import { useLanguage } from '@/app/translations';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'MA', name: 'Morocco' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'TR', name: 'Turkey' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'GH', name: 'Ghana' },
];

interface GeoTargetingSectionProps {
  isGeoTargeted: boolean;
  onIsGeoTargetedChange: (value: boolean) => void;
  targetingType?: 'city' | 'country';
  onTargetingTypeChange?: (type: 'city' | 'country') => void;
  targetCity: string | null;
  onTargetCityChange: (city: string | null) => void;
  targetCountryCode: string | null;
  onTargetCountryCodeChange: (code: string | null) => void;
  targetLatitude: number | null | undefined;
  onTargetLatitudeChange: (lat: number | null) => void;
  targetLongitude: number | null | undefined;
  onTargetLongitudeChange: (lng: number | null) => void;
  targetRadiusKm: number;
  onTargetRadiusKmChange: (radius: number) => void;
}

export function GeoTargeting(props: GeoTargetingSectionProps) {
  const { t } = useLanguage();
  const [targetingType, setTargetingType] = useState<'city' | 'country'>(props.targetingType || 'city');
  
  const isGeoTargeted = props.isGeoTargeted;
  const onIsGeoTargetedChange = props.onIsGeoTargetedChange;
  const targetCity = props.targetCity;
  const onTargetCityChange = props.onTargetCityChange;
  const targetCountryCode = props.targetCountryCode;
  const onTargetCountryCodeChange = props.onTargetCountryCodeChange;
  const targetLatitude = props.targetLatitude;
  const onTargetLatitudeChange = props.onTargetLatitudeChange;
  const targetLongitude = props.targetLongitude;
  const onTargetLongitudeChange = props.onTargetLongitudeChange;
  const targetRadiusKm = props.targetRadiusKm;
  const onTargetRadiusKmChange = props.onTargetRadiusKmChange;

  const selectedCity: CityOption | null =
    targetLatitude && targetLongitude && targetCity
      ? {
          name: targetCity,
          country: targetCountryCode || '',
          countryCode: targetCountryCode || '',
          latitude: targetLatitude,
          longitude: targetLongitude,
        }
      : null;

  const handleTargetingTypeChange = (type: 'city' | 'country') => {
    setTargetingType(type);
    props.onTargetingTypeChange?.(type);
    if (type === 'country') {
      onTargetCityChange(null);
      onTargetLatitudeChange(null);
      onTargetLongitudeChange(null);
      onTargetRadiusKmChange(500);
    } else {
      onTargetCountryCodeChange(null);
    }
  };

  const handleCityChange = (city: CityOption | null) => {
    if (city) {
      onTargetCityChange(city.name);
      onTargetCountryCodeChange(city.countryCode);
      onTargetLatitudeChange(city.latitude);
      onTargetLongitudeChange(city.longitude);
    } else {
      onTargetCityChange(null);
      onTargetLatitudeChange(null);
      onTargetLongitudeChange(null);
    }
  };

  const handleCountryChange = (countryCode: string | null) => {
    onTargetCountryCodeChange(countryCode);
    onTargetCityChange(null);
    onTargetLatitudeChange(null);
    onTargetLongitudeChange(null);
  };

  const hasValidCityLocation = targetLatitude !== null && targetLongitude !== null && targetCity !== null;
  const hasValidCountry = targetCountryCode !== null;

  return (
    <div className="space-y-6 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">{t('campaign.geoTargeting')}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <Switch
            checked={isGeoTargeted}
            onCheckedChange={onIsGeoTargetedChange}
          />
        </div>
      </div>

      {isGeoTargeted && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTargetingTypeChange('city')}
              className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${
                targetingType === 'city'
                  ? 'border-[#F47A1F] bg-[#fff6ed]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <MapPin className={`h-5 w-5 mx-auto mb-1 ${targetingType === 'city' ? 'text-[#F47A1F]' : 'text-gray-400'}`} />
              <div className={`font-medium text-sm ${targetingType === 'city' ? 'text-[#F47A1F]' : 'text-gray-600'}`}>
                {t('campaign.cityRadius')}
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTargetingTypeChange('country')}
              className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${
                targetingType === 'country'
                  ? 'border-[#F47A1F] bg-[#fff6ed]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Globe className={`h-5 w-5 mx-auto mb-1 ${targetingType === 'country' ? 'text-[#F47A1F]' : 'text-gray-400'}`} />
              <div className={`font-medium text-sm ${targetingType === 'country' ? 'text-[#F47A1F]' : 'text-gray-600'}`}>
                {t('campaign.wholeCountry')}
              </div>
            </button>
          </div>

          {targetingType === 'city' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('campaign.selectCity')}
                </label>
                <CitySearch value={selectedCity} onChange={handleCityChange} />
              </div>

              {hasValidCityLocation && (
                <>
                  <RadiusSlider 
                    value={targetRadiusKm} 
                    onChange={onTargetRadiusKmChange} 
                    min={1} 
                    max={500} 
                  />
                  <GeoRadiusMap 
                    latitude={targetLatitude!} 
                    longitude={targetLongitude!} 
                    radiusKm={targetRadiusKm} 
                    cityName={targetCity || undefined} 
                  />
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800">
                      {t('campaign.geoSummary')
                        .replace('{radius}', targetRadiusKm.toString())
                        .replace('{city}', targetCity || '')
                        .replace('{country}', targetCountryCode || '')}
                    </p>
                  </div>
                </>
              )}

              {!hasValidCityLocation && (
                <div className="text-sm text-gray-500 text-center py-4">
                  {t('campaign.noLocation')}
                </div>
              )}
            </>
          )}

          {targetingType === 'country' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('campaign.selectCountry')}
                </label>
                <select
                  value={targetCountryCode || ''}
                  onChange={(e) => handleCountryChange(e.target.value || null)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">{t('campaign.selectCountryPlaceholder')}</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {hasValidCountry && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    {t('campaign.countrySummary')
                      .replace('{country}', COUNTRIES.find(c => c.code === targetCountryCode)?.name || targetCountryCode || '')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
