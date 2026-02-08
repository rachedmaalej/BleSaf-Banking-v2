import { useTranslation } from 'react-i18next';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  gray: '#666666',
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'delete',
      iconBg: 'bg-red-100',
      iconColor: SG_COLORS.red,
      buttonBg: SG_COLORS.red,
      buttonHover: '#c9031a',
    },
    warning: {
      icon: 'warning',
      iconBg: 'bg-amber-100',
      iconColor: '#F59E0B',
      buttonBg: '#F59E0B',
      buttonHover: '#D97706',
    },
    info: {
      icon: 'info',
      iconBg: 'bg-blue-100',
      iconColor: '#3B82F6',
      buttonBg: '#3B82F6',
      buttonHover: '#2563EB',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '24px', color: styles.iconColor }}
              >
                {styles.icon}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3
            className="text-lg font-semibold text-center mb-2"
            style={{ color: SG_COLORS.black }}
          >
            {title}
          </h3>

          {/* Message */}
          <p className="text-center text-gray-600 mb-6">{message}</p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelLabel || t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: styles.buttonBg }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = styles.buttonHover)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = styles.buttonBg)}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {confirmLabel || t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
