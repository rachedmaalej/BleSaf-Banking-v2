/**
 * BléSaf Design Tokens
 *
 * Centralized design tokens extracted from codebase analysis.
 * Use these constants for consistent styling across the application.
 *
 * @see docs/design-system.md for full documentation
 */

// =============================================================================
// COLORS
// =============================================================================

/**
 * Société Générale Brand Colors
 * Primary palette for all new development
 */
export const SG_COLORS = {
  /** Primary brand red - Use for CTAs and emphasis */
  red: '#E9041E',
  /** Primary text and secondary buttons */
  black: '#1A1A1A',
  /** Accent color */
  rose: '#D66874',
  /** Secondary text */
  gray: '#666666',
  /** Background surfaces */
  lightGray: '#F5F5F5',
  /** Cards and panels */
  white: '#FFFFFF',
  /** Default borders */
  border: '#E0E0E0',
} as const;

/**
 * Semantic Colors
 * For status indicators and feedback
 */
export const SEMANTIC_COLORS = {
  success: {
    main: '#10B981',
    light: '#D1FAE5',
    dark: '#059669',
  },
  warning: {
    main: '#F59E0B',
    light: '#FEF3C7',
    dark: '#B45309',
  },
  error: {
    main: '#E9041E',
    light: '#FEE2E2',
    dark: '#B91C1C',
  },
  info: {
    main: '#666666',
    light: '#F3F4F6',
    dark: '#4B5563',
  },
} as const;

/**
 * Service-specific accent colors
 * Used in kiosk and teller interfaces
 */
export const SERVICE_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  "Retrait d'espèces": { bg: '#FFFFFF', accent: '#E9041E', text: '#1A1A1A' },
  'Relevés de compte': { bg: '#FFFFFF', accent: '#1A1A1A', text: '#1A1A1A' },
  "Dépôt d'espèces": { bg: '#FFFFFF', accent: '#D66874', text: '#1A1A1A' },
  'Autres': { bg: '#FFFFFF', accent: '#666666', text: '#1A1A1A' },
};

/**
 * Get service colors with fallback
 */
export const getServiceColors = (serviceName: string) => {
  return SERVICE_COLORS[serviceName] || SERVICE_COLORS['Autres'];
};

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const TYPOGRAPHY = {
  fontFamily: {
    primary: "'Inter', system-ui, sans-serif",
    arabic: "'Noto Sans Arabic', system-ui, sans-serif",
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '8xl': '6rem',    // 96px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

/**
 * Spacing scale based on 4px base unit
 */
export const SPACING = {
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
} as const;

// =============================================================================
// BORDERS
// =============================================================================

export const BORDERS = {
  radius: {
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },
  width: {
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },
  colors: {
    default: '#E5E7EB',
    subtle: '#E0E0E0',
    md3: '#CAC4D0',
  },
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.1)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
  xl: '0 20px 25px rgba(0,0,0,0.1)',
  /** Material Design 3 level 1 */
  md3_1: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
  /** Material Design 3 level 2 */
  md3_2: '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
  /** Card shadow */
  card: '0 2px 8px rgba(0,0,0,0.08)',
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const TRANSITIONS = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
  },
  easing: {
    default: 'ease',
    in: 'ease-in',
    out: 'ease-out',
    inOut: 'ease-in-out',
  },
} as const;

/**
 * Standard transition string
 */
export const transition = (
  property = 'all',
  duration: keyof typeof TRANSITIONS.duration = 'base',
  easing: keyof typeof TRANSITIONS.easing = 'default'
) => `${property} ${TRANSITIONS.duration[duration]} ${TRANSITIONS.easing[easing]}`;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const;

// =============================================================================
// ALERT THRESHOLDS
// =============================================================================

export const ALERT_THRESHOLDS = {
  /** Warning when queue exceeds this number */
  QUEUE_WARNING: 10,
  /** Critical alert when queue exceeds this number */
  QUEUE_CRITICAL: 20,
  /** Slow teller threshold in minutes */
  SLOW_TELLER_MINS: 15,
} as const;

// =============================================================================
// ICONS
// =============================================================================

/**
 * Service icon mapping for Material Symbols
 */
export const SERVICE_ICONS: Record<string, string> = {
  "Retrait d'espèces": 'local_atm',
  'Relevés de compte': 'receipt_long',
  "Dépôt d'espèces": 'payments',
  'Autres': 'more_horiz',
};

/**
 * Get service icon with fallback
 */
export const getServiceIcon = (serviceName: string): string => {
  return SERVICE_ICONS[serviceName] || SERVICE_ICONS['Autres'];
};

// =============================================================================
// CSS VARIABLE HELPERS
// =============================================================================

/**
 * Generate CSS custom properties from design tokens
 * Use in a global stylesheet or CSS-in-JS
 */
export const generateCSSVariables = () => `
:root {
  /* SG Brand Colors */
  --color-sg-red: ${SG_COLORS.red};
  --color-sg-black: ${SG_COLORS.black};
  --color-sg-rose: ${SG_COLORS.rose};
  --color-sg-gray: ${SG_COLORS.gray};
  --color-sg-light-gray: ${SG_COLORS.lightGray};

  /* Semantic Colors */
  --color-success: ${SEMANTIC_COLORS.success.main};
  --color-success-light: ${SEMANTIC_COLORS.success.light};
  --color-warning: ${SEMANTIC_COLORS.warning.main};
  --color-warning-light: ${SEMANTIC_COLORS.warning.light};
  --color-error: ${SEMANTIC_COLORS.error.main};
  --color-error-light: ${SEMANTIC_COLORS.error.light};

  /* Typography */
  --font-family-primary: ${TYPOGRAPHY.fontFamily.primary};
  --font-family-arabic: ${TYPOGRAPHY.fontFamily.arabic};

  /* Borders */
  --border-radius-lg: ${BORDERS.radius.lg};
  --border-radius-xl: ${BORDERS.radius.xl};
  --border-radius-2xl: ${BORDERS.radius['2xl']};

  /* Shadows */
  --shadow-card: ${SHADOWS.card};
  --shadow-md: ${SHADOWS.md};

  /* Transitions */
  --transition-fast: ${TRANSITIONS.duration.fast};
  --transition-base: ${TRANSITIONS.duration.base};
}
`;

// =============================================================================
// STYLE HELPERS
// =============================================================================

/**
 * Common button styles
 */
export const buttonStyles = {
  primary: {
    backgroundColor: SG_COLORS.red,
    color: SG_COLORS.white,
  },
  secondary: {
    backgroundColor: SG_COLORS.black,
    color: SG_COLORS.white,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: SG_COLORS.black,
    color: SG_COLORS.black,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: SG_COLORS.gray,
  },
} as const;

/**
 * Common card styles
 */
export const cardStyles = {
  default: {
    backgroundColor: SG_COLORS.white,
    borderRadius: BORDERS.radius.lg,
    border: `1px solid ${BORDERS.colors.default}`,
  },
  elevated: {
    backgroundColor: SG_COLORS.white,
    borderRadius: BORDERS.radius.xl,
    boxShadow: SHADOWS.card,
  },
} as const;

export default {
  SG_COLORS,
  SEMANTIC_COLORS,
  SERVICE_COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDERS,
  SHADOWS,
  TRANSITIONS,
  BREAKPOINTS,
  Z_INDEX,
  ALERT_THRESHOLDS,
  SERVICE_ICONS,
};
