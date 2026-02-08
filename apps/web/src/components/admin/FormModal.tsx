import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  gray: '#666666',
};

export interface FormModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  onSubmit: () => void;
  onClose: () => void;
}

export function FormModal({
  isOpen,
  title,
  subtitle,
  children,
  isLoading = false,
  submitLabel,
  cancelLabel,
  size = 'md',
  onSubmit,
  onClose,
}: FormModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full mx-4 my-8 animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: SG_COLORS.black }}>
              {title}
            </h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="px-6 py-4 max-h-[calc(100vh-280px)] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {cancelLabel || t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: SG_COLORS.black }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#333')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = SG_COLORS.black)}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {submitLabel || t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Form field components for consistency
export function FormField({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function FormInput({
  id,
  type = 'text',
  value,
  placeholder,
  disabled,
  error,
  onChange,
}: {
  id: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  value: string | number;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
        error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-300'
      }`}
    />
  );
}

export function FormSelect({
  id,
  value,
  options,
  placeholder,
  disabled,
  error,
  onChange,
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
        error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-300'
      }`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
