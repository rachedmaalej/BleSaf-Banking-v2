# BléSaf Design System

> Extracted from codebase analysis on 2026-02-02
> Version 1.0

## Overview

BléSaf is a queue management system for banking. The design follows **Société Générale (SG) brand guidelines** with a focus on professional, clean aesthetics suitable for banking environments.

---

## 1. Color Palette

### Brand Colors (SG Guidelines)

```javascript
const SG_COLORS = {
  red: '#E9041E',      // Primary brand red - CTAs, emphasis
  black: '#1A1A1A',    // Primary text, secondary buttons
  rose: '#D66874',     // Accent color
  gray: '#666666',     // Secondary text
  lightGray: '#F5F5F5', // Background surfaces
  white: '#FFFFFF',    // Cards, panels
};
```

### Semantic Colors

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| Success | Green | `#10B981` | Completed actions, open status |
| Warning | Amber | `#F59E0B` | Alerts, slow indicators |
| Error/Danger | Red | `#E9041E` | Critical alerts, errors |
| Info | Gray | `#666666` | Informational messages |

### Background Colors

| Surface | Color | Usage |
|---------|-------|-------|
| Page Background | `#FAFAFA` or `#F5F5F5` | Main app background |
| Card/Panel | `#FFFFFF` | Content containers |
| Subtle Background | `#F8F8F8` | Secondary panels |
| Alert (Warning) | `#FEF3C7` | Warning banners |
| Alert (Critical) | `#FEE2E2` | Error/critical banners |
| Success Background | `#ECFDF5` or `#D1FAE5` | Success states |

### Tailwind Primary Scale (Legacy)

Used in base UI components (Button, Badge, Card):

```javascript
primary: {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',  // Main primary
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
}
```

> **Note:** The SG brand colors should take precedence. Consider migrating primary-600 usage to SG_COLORS.red for consistency.

---

## 2. Typography

### Font Families

```css
/* Primary (Latin) */
font-family: 'Inter', system-ui, sans-serif;

/* Arabic */
font-family: 'Noto Sans Arabic', system-ui, sans-serif;
```

### Font Scale

| Token | Size | Tailwind Class | Usage |
|-------|------|----------------|-------|
| xs | 12px | `text-xs` | Badges, labels |
| sm | 14px | `text-sm` | Body text, buttons |
| base | 16px | `text-base` | Default body |
| lg | 18px | `text-lg` | Card titles |
| xl | 20px | `text-xl` | Section headers |
| 2xl | 24px | `text-2xl` | Page headers |
| 3xl | 30px | `text-3xl` | Hero text |
| 4xl-8xl | 36-96px | `text-4xl` to `text-8xl` | Display (tickets, counters) |

### Font Weights

| Weight | Tailwind | Usage |
|--------|----------|-------|
| 300 | `font-light` | Display numbers, timers |
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Labels, nav items |
| 600 | `font-semibold` | Section titles, buttons |
| 700 | `font-bold` | Page headers, emphasis |

### Typography Patterns

```jsx
// Page header
<h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
<p className="text-gray-600">Subtitle or description</p>

// Section header
<h2 className="text-lg font-semibold flex items-center gap-2">
  <Icon />
  Section Title
</h2>

// Card title
<h3 className="text-lg font-semibold text-gray-900">Card Title</h3>
<p className="text-sm text-gray-500 mt-1">Description</p>

// Display number (kiosk/teller)
<div className="text-6xl lg:text-8xl" style={{ fontWeight: 300 }}>
  A-045
</div>
```

---

## 3. Spacing Scale

Based on 4px base unit:

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| 1 | 4px | `p-1`, `gap-1` | Minimal spacing |
| 2 | 8px | `p-2`, `gap-2` | Tight spacing |
| 3 | 12px | `p-3`, `gap-3` | Default gap |
| 4 | 16px | `p-4`, `gap-4` | Card padding, sections |
| 5 | 20px | `p-5` | Panel padding |
| 6 | 24px | `p-6`, `gap-6` | Section spacing |
| 8 | 32px | `p-8`, `gap-8` | Large padding |
| 10 | 40px | `p-10` | Kiosk panels |
| 12 | 48px | `py-12` | Page sections |

### Common Spacing Patterns

```jsx
// Card with standard padding
<div className="p-4 lg:p-6">...</div>

// Grid gap
<div className="grid gap-4 lg:gap-6">...</div>

// Section margin
<div className="mb-6">...</div>

// Flex gap
<div className="flex items-center gap-2 lg:gap-4">...</div>
```

---

## 4. Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| sm | 4px | `rounded` | Small elements |
| md | 6px | `rounded-md` | Inputs |
| lg | 8px | `rounded-lg` | Buttons, cards |
| xl | 12px | `rounded-xl` | Cards, panels |
| 2xl | 16px | `rounded-2xl` | Large panels, kiosk |
| 3xl | 24px | `rounded-3xl` | Kiosk main panels |
| full | 9999px | `rounded-full` | Badges, avatars, pills |

### Usage Guidelines

- **Buttons:** `rounded-lg` (8px)
- **Inputs:** `rounded-lg` (8px)
- **Cards:** `rounded-lg` (admin) or `rounded-xl` (modern)
- **Kiosk/Teller panels:** `rounded-2xl` to `rounded-3xl`
- **Badges/Pills:** `rounded-full`
- **Avatars:** `rounded-full`

---

## 5. Shadows

| Level | Tailwind | CSS | Usage |
|-------|----------|-----|-------|
| sm | `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards |
| md | `shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Elevated |
| lg | `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| MD3-1 | custom | `0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)` | Material Design 3 |
| MD3-2 | custom | `0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)` | Material Design 3 elevated |

### Card Shadow Pattern

```jsx
// Standard card
<div className="bg-white rounded-xl shadow-sm border border-gray-200">

// Kiosk card
<div className="bg-white rounded-2xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
```

---

## 6. Borders

### Border Colors

| Type | Color | Usage |
|------|-------|-------|
| Default | `#E5E7EB` or `border-gray-200` | Cards, dividers |
| Subtle | `#E0E0E0` | Input borders |
| MD3 | `#CAC4D0` | Material Design style |
| Accent | SG brand colors | Active states, status |

### Border Patterns

```jsx
// Card border
<div className="border border-gray-200">

// Input border
<input className="border border-gray-300 focus:border-primary-500" />

// Accent left border (alerts, status cards)
<div style={{ borderLeft: `4px solid ${SG_COLORS.red}` }}>

// Counter status border
<div style={{ borderColor: status === 'open' ? '#10B981' : '#E5E7EB' }}>
```

---

## 7. Component Specifications

### Button Component

**Variants:**

```jsx
const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',    // Use SG red for CTA
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  success: 'bg-green-600 text-white hover:bg-green-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
};
```

**Sizes:**

```jsx
const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
};
```

**SG-Styled Primary Button:**

```jsx
<button
  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
  style={{ background: '#E9041E' }}
>
  <span className="material-symbols-outlined">campaign</span>
  Appeler
</button>
```

**Outlined Button (SG Style):**

```jsx
<button
  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium border transition-all hover:bg-gray-50"
  style={{ borderColor: '#1A1A1A', color: '#1A1A1A' }}
>
  <span className="material-symbols-outlined">cancel</span>
  Annuler
</button>
```

### Card Component

**Base Card:**

```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  {/* content */}
</div>
```

**Card with Header:**

```jsx
<div className="bg-white rounded-lg border border-gray-200 p-5">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <span className="material-symbols-outlined text-gray-500">icon</span>
      Title
    </h2>
  </div>
  {/* content */}
</div>
```

### Badge Component

**Variants:**

```jsx
const variants = {
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-800',
};
```

**Base Badge:**

```jsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  Active
</span>
```

### Status Indicator

```jsx
<span className="inline-flex items-center gap-1.5">
  <span className="w-2 h-2 rounded-full bg-green-500" />
  <span className="text-sm text-green-700">En ligne</span>
</span>
```

### Input Field

```jsx
<input
  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
  placeholder="Placeholder text"
/>
```

**Select Field:**

```jsx
<select className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
  <option value="">-- Select --</option>
</select>
```

---

## 8. Layout Patterns

### Page Layout

```jsx
<div className="max-w-7xl mx-auto">
  {/* Header */}
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
    <p className="text-gray-600">Description</p>
  </div>

  {/* Content Grid */}
  <div className="grid lg:grid-cols-2 gap-6">
    {/* Cards */}
  </div>
</div>
```

### Scorecard Grid

```jsx
<div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
  <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
    <div className="text-3xl font-bold">47</div>
    <div className="text-sm text-gray-600">Label</div>
  </div>
</div>
```

### Full-Screen Layout (Kiosk/Teller)

```jsx
<div className="h-screen flex flex-col overflow-hidden">
  {/* Header */}
  <header className="flex justify-between items-center px-6 py-3 bg-white flex-shrink-0"
          style={{ borderBottom: '1px solid #CAC4D0' }}>
    {/* Logo, nav, time */}
  </header>

  {/* Main content */}
  <main className="flex-1 flex overflow-hidden">
    {/* Panels */}
  </main>

  {/* Footer */}
  <footer className="px-6 py-4 flex-shrink-0" style={{ background: '#FAFAFA', borderTop: '1px solid #E5E5E5' }}>
    {/* Queue bar, etc */}
  </footer>
</div>
```

### Asymmetric Panel Layout (Teller Dashboard)

```jsx
<main className="flex-1 flex flex-col md:flex-row overflow-hidden">
  {/* Left Panel - Dominant (2/3) */}
  <div className="flex-[2] p-6 lg:p-10 bg-white">
    {/* Main content */}
  </div>

  {/* Right Panel - Secondary (1/3) */}
  <div className="flex-1 p-6 lg:p-8" style={{ background: '#F8F8F8', borderLeft: '1px solid #E5E5E5' }}>
    {/* Secondary content */}
  </div>
</main>
```

---

## 9. Iconography

### Primary: Material Symbols

Used throughout the application for consistency:

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
```

**Usage:**

```jsx
<span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
  icon_name
</span>
```

**Common Icons:**

| Icon | Name | Usage |
|------|------|-------|
| `campaign` | campaign | Call next |
| `check_circle` | check_circle | Complete |
| `cancel` | cancel | No show, cancel |
| `warning` | warning | Alerts |
| `groups` | groups | Queue count |
| `storefront` | storefront | Counters |
| `leaderboard` | leaderboard | Performance |
| `schedule` | schedule | Waiting |
| `local_atm` | local_atm | Withdrawal |
| `savings` | savings | Deposit |
| `person_add` | person_add | New account |

**Icon Sizes:**

| Size | Value | Usage |
|------|-------|-------|
| sm | 16px | Inline with text |
| md | 18-20px | Buttons |
| lg | 24px | Default |
| xl | 32px | Headers |
| 2xl | 48px | Empty states |
| display | 64px+ | Kiosk service cards |

### Secondary: Heroicons (AppLayout only)

```jsx
import { HomeIcon, UsersIcon } from '@heroicons/react/24/outline';

<HomeIcon className="h-5 w-5" />
```

> **Recommendation:** Migrate to Material Symbols for consistency.

---

## 10. Animation & Transitions

### Transition Defaults

```css
/* Default transition */
transition: all 0.2s ease;

/* Slow transition */
transition: all 0.3s ease;

/* Tailwind class */
className="transition-colors duration-200"
className="transition-all duration-300"
```

### Interactive States

```jsx
// Button hover
className="hover:opacity-90"
className="hover:bg-gray-50"

// Card hover
className="hover:shadow-lg"

// Active state (touch)
className="active:scale-[0.98]"
```

### Loading Spinner

```jsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
```

### Keyframe Animations

```css
/* Ticket pulse */
@keyframes ticketPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Usage */
.animate-ticket {
  animation: ticketPulse 2s ease-in-out infinite;
}
```

---

## 11. Responsive Breakpoints

Using Tailwind defaults:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Extra large |

### Mobile-First Patterns

```jsx
// Font size
className="text-sm sm:text-base lg:text-lg"

// Padding
className="p-4 sm:p-6 lg:p-8"

// Grid columns
className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"

// Flex direction
className="flex flex-col md:flex-row"

// Hidden on mobile
className="hidden sm:block"
className="sm:hidden"
```

---

## 12. Service Color Mapping

Used in kiosk and teller screens:

```javascript
const SERVICE_COLORS = {
  'Retrait':             { accent: '#E9041E' },  // SG Red
  'Dépôt':               { accent: '#1A1A1A' },  // Black
  'Ouverture de compte': { accent: '#D66874' },  // Rose
  'Autres':              { accent: '#666666' },  // Gray
};
```

### Usage (Service indicator line)

```jsx
<span
  className="block h-0.5 rounded"
  style={{ width: '40px', background: colors.accent }}
/>
```

### Usage (Queue ticket dot)

```jsx
<span
  className="w-2 h-2 rounded-full"
  style={{ background: colors.accent }}
/>
```

---

## 13. Alert System

### Thresholds

```javascript
const ALERT_THRESHOLDS = {
  QUEUE_WARNING: 10,     // > 10 customers waiting
  QUEUE_CRITICAL: 20,    // > 20 customers waiting
  SLOW_TELLER_MINS: 15,  // > 15 min avg service time
};
```

### Alert Banner

```jsx
<div
  className="p-4 rounded-lg border-l-4"
  style={{
    backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7',
    borderColor: isCritical ? '#E9041E' : '#F59E0B',
  }}
>
  <div className="flex items-center gap-2 mb-2">
    <span className="material-symbols-outlined" style={{ color: borderColor }}>
      warning
    </span>
    <span className="font-semibold">{alertCount} alerte(s)</span>
  </div>
  <ul className="text-sm space-y-1">
    {alerts.map(alert => (
      <li key={alert.id} className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
        {alert.message}
      </li>
    ))}
  </ul>
</div>
```

---

## 14. RTL Support

### Document Direction

```javascript
const isRTL = i18n.language === 'ar';
document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;
```

### RTL Classes (via tailwindcss-rtl)

```jsx
// Start/End instead of Left/Right
className="ps-4"   // padding-start (left in LTR, right in RTL)
className="pe-4"   // padding-end
className="ms-2"   // margin-start
className="me-2"   // margin-end

// Border start/end
className="border-s"
className="border-e"

// Fixed inset
className="inset-y-0 start-0"  // Left in LTR, right in RTL
```

---

## 15. Identified Inconsistencies

### Issues to Address

1. **Two Color Systems**
   - Components use Tailwind `primary-600` (blue)
   - Pages use SG brand `#E9041E` (red)
   - **Recommendation:** Update `primary` in tailwind.config.js to SG red scale

2. **Icon Libraries**
   - AppLayout uses Heroicons
   - Everything else uses Material Symbols
   - **Recommendation:** Migrate AppLayout to Material Symbols

3. **Button Implementation**
   - Components use `Button.tsx` with Tailwind classes
   - Pages use inline styles with SG colors
   - **Recommendation:** Update Button component variants to SG colors

4. **Card Borders**
   - Some cards use `border-gray-200`
   - Some use `border: '1px solid #E5E5E5'`
   - **Recommendation:** Standardize on Tailwind border-gray-200

5. **Shadow Definitions**
   - Mix of Tailwind shadows and custom MD3 shadows
   - **Recommendation:** Create custom shadow utilities or stick to Tailwind defaults

---

## 16. Migration Checklist

- [ ] Update `tailwind.config.js` primary colors to SG red scale
- [ ] Replace Heroicons in AppLayout with Material Symbols
- [ ] Update Button.tsx variants to use SG colors
- [ ] Standardize border colors across all components
- [ ] Create CSS custom properties for SG brand colors
- [ ] Add custom shadow utilities to index.css
- [ ] Audit all hardcoded color values and replace with tokens

---

## 17. Quick Reference

### Copy-Paste Snippets

**SG Red Button:**
```jsx
className="px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
style={{ background: '#E9041E' }}
```

**Card:**
```jsx
className="bg-white rounded-lg border border-gray-200 p-5"
```

**Section Header:**
```jsx
<h2 className="text-lg font-semibold flex items-center gap-2">
  <span className="material-symbols-outlined text-gray-500">icon</span>
  Title
</h2>
```

**Status Dot:**
```jsx
<span className="w-3 h-3 rounded-full" style={{ backgroundColor: isActive ? '#10B981' : '#9CA3AF' }} />
```

**Loading State:**
```jsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
```

---

*Last updated: 2026-02-02*
*Generated by Design System Extractor Skill*
