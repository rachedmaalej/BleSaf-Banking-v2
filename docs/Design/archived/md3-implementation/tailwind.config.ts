import type { Config } from 'tailwindcss'
import { md3Colors, md3Elevation, md3Shape, md3Motion } from './lib/design-system/md3-tokens'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // MD3 Light theme colors (default)
        primary: {
          DEFAULT: md3Colors.light.primary,
          container: md3Colors.light.primaryContainer,
        },
        'on-primary': {
          DEFAULT: md3Colors.light.onPrimary,
          container: md3Colors.light.onPrimaryContainer,
        },
        secondary: {
          DEFAULT: md3Colors.light.secondary,
          container: md3Colors.light.secondaryContainer,
        },
        'on-secondary': {
          DEFAULT: md3Colors.light.onSecondary,
          container: md3Colors.light.onSecondaryContainer,
        },
        tertiary: {
          DEFAULT: md3Colors.light.tertiary,
          container: md3Colors.light.tertiaryContainer,
        },
        'on-tertiary': {
          DEFAULT: md3Colors.light.onTertiary,
          container: md3Colors.light.onTertiaryContainer,
        },
        error: {
          DEFAULT: md3Colors.light.error,
          container: md3Colors.light.errorContainer,
        },
        'on-error': {
          DEFAULT: md3Colors.light.onError,
          container: md3Colors.light.onErrorContainer,
        },
        background: md3Colors.light.background,
        'on-background': md3Colors.light.onBackground,
        surface: {
          DEFAULT: md3Colors.light.surface,
          variant: md3Colors.light.surfaceVariant,
          'container-lowest': md3Colors.light.surfaceContainerLowest,
          'container-low': md3Colors.light.surfaceContainerLow,
          'container': md3Colors.light.surfaceContainer,
          'container-high': md3Colors.light.surfaceContainerHigh,
          'container-highest': md3Colors.light.surfaceContainerHighest,
        },
        'on-surface': {
          DEFAULT: md3Colors.light.onSurface,
          variant: md3Colors.light.onSurfaceVariant,
        },
        outline: {
          DEFAULT: md3Colors.light.outline,
          variant: md3Colors.light.outlineVariant,
        },
        'inverse-surface': md3Colors.light.inverseSurface,
        'inverse-on-surface': md3Colors.light.inverseOnSurface,
        'inverse-primary': md3Colors.light.inversePrimary,
        'surface-tint': md3Colors.light.surfaceTint,
        shadow: md3Colors.light.shadow,
        scrim: md3Colors.light.scrim,

        // Keep these for compatibility with existing shadcn components
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        'md3-none': md3Shape.corner.none,
        'md3-xs': md3Shape.corner.extraSmall,
        'md3-sm': md3Shape.corner.small,
        'md3-md': md3Shape.corner.medium,
        'md3-lg': md3Shape.corner.large,
        'md3-xl': md3Shape.corner.extraLarge,
        'md3-full': md3Shape.corner.full,
        // Keep these for compatibility
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'md3-0': md3Elevation.level0,
        'md3-1': md3Elevation.level1,
        'md3-2': md3Elevation.level2,
        'md3-3': md3Elevation.level3,
        'md3-4': md3Elevation.level4,
        'md3-5': md3Elevation.level5,
      },
      transitionDuration: {
        'md3-short1': md3Motion.duration.short1,
        'md3-short2': md3Motion.duration.short2,
        'md3-short3': md3Motion.duration.short3,
        'md3-short4': md3Motion.duration.short4,
        'md3-medium1': md3Motion.duration.medium1,
        'md3-medium2': md3Motion.duration.medium2,
        'md3-medium3': md3Motion.duration.medium3,
        'md3-medium4': md3Motion.duration.medium4,
        'md3-long1': md3Motion.duration.long1,
        'md3-long2': md3Motion.duration.long2,
        'md3-long3': md3Motion.duration.long3,
        'md3-long4': md3Motion.duration.long4,
      },
      transitionTimingFunction: {
        'md3-standard': md3Motion.easing.standard,
        'md3-emphasized': md3Motion.easing.emphasized,
        'md3-decelerate': md3Motion.easing.emphasizedDecelerate,
        'md3-accelerate': md3Motion.easing.emphasizedAccelerate,
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
