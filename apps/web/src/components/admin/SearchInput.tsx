import { useTranslation } from 'react-i18next';

export interface SearchInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export function SearchInput({
  value,
  placeholder,
  onChange,
  onClear,
  className = '',
}: SearchInputProps) {
  const { t } = useTranslation();

  return (
    <div className={`relative ${className}`}>
      <span
        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        style={{ fontSize: '20px' }}
      >
        search
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder || t('common.search')}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            close
          </span>
        </button>
      )}
    </div>
  );
}
