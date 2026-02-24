'use client';

import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/app/translations';
import { useMemo } from 'react';

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function RadiusSlider({
  value,
  onChange,
  min = 1,
  max = 500,
  disabled = false,
}: RadiusSliderProps) {
  const { t } = useLanguage();

  const sliderValue = useMemo(() => {
    return [Math.min(Math.max(value, min), max)];
  }, [value, min, max]);

  const handleValueChange = (newValue: number[]) => {
    onChange(newValue[0]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {t('campaign.targetRadius')}
        </label>
        <span className="text-sm font-semibold text-orange-600">
          {value} km
        </span>
      </div>
      <Slider
        value={sliderValue}
        onValueChange={handleValueChange}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        className="cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min} km</span>
        <span>{max} km</span>
      </div>
    </div>
  );
}
