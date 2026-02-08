export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDropdownProps {
  value: string;
  options: FilterOption[];
  label?: string;
  allLabel?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterDropdown({
  value,
  options,
  label,
  allLabel,
  onChange,
  className = '',
}: FilterDropdownProps) {
  // Use label as allLabel if allLabel not explicitly set
  const displayAllLabel = allLabel ?? (label ? `Tous les ${label.toLowerCase()}s` : 'Tous');

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white ${className}`}
    >
      <option value="">{displayAllLabel}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
