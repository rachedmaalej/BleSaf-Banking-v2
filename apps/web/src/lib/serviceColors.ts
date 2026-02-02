// Service color mapping for consistent styling across the app

export interface ServiceColorScheme {
  bg: string;
  border: string;
  text: string;
  badge: string;
}

export const SERVICE_COLORS: Record<string, ServiceColorScheme> = {
  "Retrait d'espèces": {
    bg: 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/30',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  'Relevés de compte': {
    bg: 'bg-gradient-to-br from-blue-500/30 to-blue-600/30',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    badge: 'bg-blue-100 text-blue-800',
  },
  "Dépôt d'espèces": {
    bg: 'bg-gradient-to-br from-orange-500/30 to-orange-600/30',
    border: 'border-orange-500/30',
    text: 'text-orange-300',
    badge: 'bg-orange-100 text-orange-800',
  },
  'Prêts': {
    bg: 'bg-gradient-to-br from-purple-500/30 to-purple-600/30',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    badge: 'bg-purple-100 text-purple-800',
  },
  Change: {
    bg: 'bg-gradient-to-br from-teal-500/30 to-teal-600/30',
    border: 'border-teal-500/30',
    text: 'text-teal-300',
    badge: 'bg-teal-100 text-teal-800',
  },
  Autres: {
    bg: 'bg-gradient-to-br from-gray-500/30 to-gray-600/30',
    border: 'border-gray-500/30',
    text: 'text-gray-300',
    badge: 'bg-gray-100 text-gray-800',
  },
  default: {
    bg: 'bg-gradient-to-br from-gray-500/30 to-gray-600/30',
    border: 'border-gray-500/30',
    text: 'text-gray-300',
    badge: 'bg-gray-100 text-gray-800',
  },
};

export function getServiceColors(serviceName: string): ServiceColorScheme {
  return SERVICE_COLORS[serviceName] || SERVICE_COLORS.default;
}

// Service icons mapping
export const SERVICE_ICONS: Record<string, string> = {
  "Retrait d'espèces": '💵',
  'Relevés de compte': '📥',
  "Dépôt d'espèces": '📋',
  'Prêts': '🏦',
  Change: '💱',
  Autres: '📂',
  default: '📂',
};

export function getServiceIcon(serviceName: string, dbIcon: string | null): string {
  if (dbIcon) return dbIcon;
  return SERVICE_ICONS[serviceName] || SERVICE_ICONS.default;
}
