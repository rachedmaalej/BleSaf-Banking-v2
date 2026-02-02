interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({
  variant = 'gray',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  const variants = {
    primary: 'bg-primary-100 text-primary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

// Status badge with dot indicator
export function StatusBadge({
  status,
  label,
}: {
  status: 'online' | 'offline' | 'busy' | 'idle';
  label?: string;
}) {
  const statusStyles = {
    online: { dot: 'bg-green-500', text: 'text-green-700' },
    offline: { dot: 'bg-gray-400', text: 'text-gray-600' },
    busy: { dot: 'bg-amber-500', text: 'text-amber-700' },
    idle: { dot: 'bg-red-500', text: 'text-red-700' },
  };

  const style = statusStyles[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {label && <span className={`text-sm ${style.text}`}>{label}</span>}
    </span>
  );
}
