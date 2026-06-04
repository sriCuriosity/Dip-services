import { useMemo, useState, type FC } from 'react';
import { CITIES_LIST } from '@/src/lib/kanyakumariCities';

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const CityCombobox: FC<CityComboboxProps> = ({
  value,
  onChange,
  placeholder = 'City',
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredCities = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return CITIES_LIST;
    return CITIES_LIST.filter((city) => city.toLowerCase().includes(query));
  }, [value]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        className={className}
        value={value}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 120)}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        autoComplete="off"
        required={required}
      />
      {isOpen && filteredCities.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl">
          {filteredCities.map((city) => (
            <button
              key={city}
              type="button"
              className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(city);
                setIsOpen(false);
              }}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
