'use client';

import { useState, useRef, useEffect } from 'react';
import { MAJOR_CITIES } from '@/lib/geo/distance';
import { Search, MapPin } from 'lucide-react';
import { useLanguage } from '@/app/translations';

export interface CityOption {
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

interface CitySearchProps {
  value: CityOption | null;
  onChange: (city: CityOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CitySearch({
  value,
  onChange,
  disabled = false,
}: CitySearchProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities: CityOption[] = (() => {
    if (query.length === 0) {
      return MAJOR_CITIES.slice(0, 8);
    }
    const searchLower = query.toLowerCase();
    return MAJOR_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(searchLower) ||
        city.country.toLowerCase().includes(searchLower) ||
        city.countryCode.toLowerCase().includes(searchLower)
    ).slice(0, 8);
  })();

  const handleSelect = (city: CityOption) => {
    onChange(city);
    setQuery(city.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  const displayValue = value ? `${value.name}, ${value.countryCode}` : query;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) {
              onChange(null);
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={t('campaign.searchCity')}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && filteredCities.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredCities.map((city, index) => (
            <li key={`${city.countryCode}-${city.name}-${index}`}>
              <button
                type="button"
                onClick={() => handleSelect(city)}
                disabled={disabled}
                className="w-full px-4 py-2 text-left hover:bg-orange-50 flex items-center gap-2 disabled:opacity-50"
              >
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium">{city.name}</span>
                <span className="text-gray-500 text-sm">({city.countryCode})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
