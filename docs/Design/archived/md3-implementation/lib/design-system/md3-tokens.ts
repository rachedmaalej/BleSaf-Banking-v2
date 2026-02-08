/**
 * Material Design 3 Design Tokens
 * Based on Material Design 3 specifications
 */

export const md3Colors = {
  light: {
    // Primary palette
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EADDFF',
    onPrimaryContainer: '#21005D',

    // Secondary palette
    secondary: '#625B71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E8DEF8',
    onSecondaryContainer: '#1D192B',

    // Tertiary palette
    tertiary: '#7D5260',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD8E4',
    onTertiaryContainer: '#31111D',

    // Error palette
    error: '#B3261E',
    onError: '#FFFFFF',
    errorContainer: '#F9DEDC',
    onErrorContainer: '#410E0B',

    // Background & Surface
    background: '#FFFBFE',
    onBackground: '#1C1B1F',
    surface: '#FFFBFE',
    onSurface: '#1C1B1F',
    surfaceVariant: '#E7E0EC',
    onSurfaceVariant: '#49454F',

    // Surface containers
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F7F2FA',
    surfaceContainer: '#F3EDF7',
    surfaceContainerHigh: '#ECE6F0',
    surfaceContainerHighest: '#E6E0E9',

    // Outline
    outline: '#79747E',
    outlineVariant: '#CAC4D0',

    // Other
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#D0BCFF',
    surfaceTint: '#6750A4',
  },
  dark: {
    // Primary palette
    primary: '#D0BCFF',
    onPrimary: '#381E72',
    primaryContainer: '#4F378B',
    onPrimaryContainer: '#EADDFF',

    // Secondary palette
    secondary: '#CCC2DC',
    onSecondary: '#332D41',
    secondaryContainer: '#4A4458',
    onSecondaryContainer: '#E8DEF8',

    // Tertiary palette
    tertiary: '#EFB8C8',
    onTertiary: '#492532',
    tertiaryContainer: '#633B48',
    onTertiaryContainer: '#FFD8E4',

    // Error palette
    error: '#F2B8B5',
    onError: '#601410',
    errorContainer: '#8C1D18',
    onErrorContainer: '#F9DEDC',

    // Background & Surface
    background: '#1C1B1F',
    onBackground: '#E6E1E5',
    surface: '#1C1B1F',
    onSurface: '#E6E1E5',
    surfaceVariant: '#49454F',
    onSurfaceVariant: '#CAC4D0',

    // Surface containers
    surfaceContainerLowest: '#0F0D13',
    surfaceContainerLow: '#1D1B20',
    surfaceContainer: '#211F26',
    surfaceContainerHigh: '#2B2930',
    surfaceContainerHighest: '#36343B',

    // Outline
    outline: '#938F99',
    outlineVariant: '#49454F',

    // Other
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E6E1E5',
    inverseOnSurface: '#313033',
    inversePrimary: '#6750A4',
    surfaceTint: '#D0BCFF',
  },
}

export const md3Typography = {
  // Display styles
  displayLarge: {
    fontSize: '57px',
    lineHeight: '64px',
    fontWeight: '400',
    letterSpacing: '-0.25px',
  },
  displayMedium: {
    fontSize: '45px',
    lineHeight: '52px',
    fontWeight: '400',
    letterSpacing: '0px',
  },
  displaySmall: {
    fontSize: '36px',
    lineHeight: '44px',
    fontWeight: '400',
    letterSpacing: '0px',
  },

  // Headline styles
  headlineLarge: {
    fontSize: '32px',
    lineHeight: '40px',
    fontWeight: '400',
    letterSpacing: '0px',
  },
  headlineMedium: {
    fontSize: '28px',
    lineHeight: '36px',
    fontWeight: '400',
    letterSpacing: '0px',
  },
  headlineSmall: {
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: '400',
    letterSpacing: '0px',
  },

  // Title styles
  titleLarge: {
    fontSize: '22px',
    lineHeight: '28px',
    fontWeight: '400',
    letterSpacing: '0px',
  },
  titleMedium: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: '500',
    letterSpacing: '0.15px',
  },
  titleSmall: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: '500',
    letterSpacing: '0.1px',
  },

  // Body styles
  bodyLarge: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: '400',
    letterSpacing: '0.5px',
  },
  bodyMedium: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: '400',
    letterSpacing: '0.25px',
  },
  bodySmall: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: '400',
    letterSpacing: '0.4px',
  },

  // Label styles
  labelLarge: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: '500',
    letterSpacing: '0.1px',
  },
  labelMedium: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
  labelSmall: {
    fontSize: '11px',
    lineHeight: '16px',
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
}

export const md3Elevation = {
  level0: 'none',
  level1: '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
  level2: '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  level3: '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
  level4: '0px 2px 3px 0px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
  level5: '0px 4px 4px 0px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
}

export const md3Shape = {
  corner: {
    none: '0px',
    extraSmall: '4px',
    small: '8px',
    medium: '12px',
    large: '16px',
    extraLarge: '28px',
    full: '9999px',
  },
}

export const md3Motion = {
  duration: {
    short1: '50ms',
    short2: '100ms',
    short3: '150ms',
    short4: '200ms',
    medium1: '250ms',
    medium2: '300ms',
    medium3: '350ms',
    medium4: '400ms',
    long1: '450ms',
    long2: '500ms',
    long3: '550ms',
    long4: '600ms',
    extraLong1: '700ms',
    extraLong2: '800ms',
    extraLong3: '900ms',
    extraLong4: '1000ms',
  },
  easing: {
    linear: 'cubic-bezier(0, 0, 1, 1)',
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    standardAccelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    standardDecelerate: 'cubic-bezier(0, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  },
}

export const md3StateLayer = {
  hover: '0.08',
  focus: '0.12',
  pressed: '0.12',
  dragged: '0.16',
}
