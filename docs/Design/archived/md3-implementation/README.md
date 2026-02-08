# Material Design 3 Implementation Guide

This guide covers the complete implementation of Material Design 3 in your Next.js application.

## 📋 Table of Contents

1. [Installation](#installation)
2. [Setup](#setup)
3. [Component Usage](#component-usage)
4. [Migration Strategy](#migration-strategy)
5. [Theming](#theming)
6. [Best Practices](#best-practices)

## 🚀 Installation

### Step 1: Install Dependencies

```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-switch @radix-ui/react-slider class-variance-authority clsx tailwind-merge
```

### Step 2: Copy Files

Copy all files from the `md3-implementation` folder to your project:

```bash
# Design tokens
cp lib/design-system/md3-tokens.ts <your-project>/lib/design-system/

# Tailwind config
cp tailwind.config.ts <your-project>/

# Global CSS
cp app/globals.css <your-project>/app/

# Theme provider
cp components/providers/md3-theme-provider.tsx <your-project>/components/providers/

# Material Icon component
cp components/ui/material-icon.tsx <your-project>/components/ui/

# All MD3 components
cp -r components/md3/ <your-project>/components/
```

## ⚙️ Setup

### 1. Update Root Layout

```typescript
// app/layout.tsx
import { MD3ThemeProvider } from '@/components/providers/md3-theme-provider'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FFFBFE" />
      </head>
      <body>
        <MD3ThemeProvider defaultTheme="system" storageKey="md3-theme">
          {children}
        </MD3ThemeProvider>
      </body>
    </html>
  )
}
```

### 2. Add Indeterminate Progress Animation

Add this to your `app/globals.css`:

```css
@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
    width: 30%;
  }
  50% {
    width: 30%;
  }
  70% {
    width: 70%;
  }
  90% {
    transform: translateX(100%);
    width: 30%;
  }
  100% {
    transform: translateX(100%);
    width: 30%;
  }
}
```

### 3. Create Utils Helper (if not exists)

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## 📚 Component Usage

### Buttons

```tsx
import { MD3Button } from '@/components/md3/button'
import { MaterialIcon } from '@/components/ui/material-icon'

export function ButtonExamples() {
  return (
    <div className="flex gap-4">
      <MD3Button variant="filled">Filled Button</MD3Button>
      <MD3Button variant="outlined">Outlined Button</MD3Button>
      <MD3Button variant="text">Text Button</MD3Button>
      <MD3Button variant="elevated">Elevated Button</MD3Button>
      <MD3Button variant="tonal">Tonal Button</MD3Button>
      
      {/* With icon */}
      <MD3Button 
        variant="filled"
        icon={<MaterialIcon icon="add" />}
      >
        Add Item
      </MD3Button>
      
      {/* Icon only */}
      <MD3Button variant="filled" size="icon">
        <MaterialIcon icon="favorite" />
      </MD3Button>
    </div>
  )
}
```

### FAB (Floating Action Button)

```tsx
import { MD3FAB } from '@/components/md3/fab'
import { MaterialIcon } from '@/components/ui/material-icon'

export function FABExamples() {
  return (
    <div className="flex gap-4">
      <MD3FAB
        variant="primary"
        icon={<MaterialIcon icon="add" />}
        onClick={() => console.log('FAB clicked')}
      />
      
      {/* Extended FAB */}
      <MD3FAB
        variant="primary"
        size="extended"
        icon={<MaterialIcon icon="edit" />}
        label="Compose"
        onClick={() => console.log('Compose clicked')}
      />
      
      {/* Lowered elevation */}
      <MD3FAB
        variant="surface"
        icon={<MaterialIcon icon="navigation" />}
        lowered
      />
    </div>
  )
}
```

### Cards

```tsx
import {
  MD3Card,
  MD3CardHeader,
  MD3CardTitle,
  MD3CardDescription,
  MD3CardContent,
  MD3CardFooter,
} from '@/components/md3/card'
import { MD3Button } from '@/components/md3/button'

export function CardExamples() {
  return (
    <div className="grid gap-4 grid-cols-3">
      <MD3Card variant="elevated">
        <MD3CardHeader>
          <MD3CardTitle>Elevated Card</MD3CardTitle>
          <MD3CardDescription>This card has elevation</MD3CardDescription>
        </MD3CardHeader>
        <MD3CardContent>
          Card content goes here
        </MD3CardContent>
        <MD3CardFooter>
          <MD3Button variant="text">Action</MD3Button>
        </MD3CardFooter>
      </MD3Card>

      <MD3Card variant="filled">
        <MD3CardHeader>
          <MD3CardTitle>Filled Card</MD3CardTitle>
        </MD3CardHeader>
      </MD3Card>

      <MD3Card variant="outlined">
        <MD3CardHeader>
          <MD3CardTitle>Outlined Card</MD3CardTitle>
        </MD3CardHeader>
      </MD3Card>
    </div>
  )
}
```

### Text Fields

```tsx
import { MD3TextField } from '@/components/md3/text-field'
import { MaterialIcon } from '@/components/ui/material-icon'

export function TextFieldExamples() {
  return (
    <div className="flex flex-col gap-4 max-w-md">
      <MD3TextField
        variant="filled"
        label="Email"
        type="email"
        placeholder="Enter your email"
      />

      <MD3TextField
        variant="outlined"
        label="Password"
        type="password"
        supportingText="Must be at least 8 characters"
      />

      <MD3TextField
        variant="filled"
        label="Search"
        leadingIcon={<MaterialIcon icon="search" />}
      />

      <MD3TextField
        variant="outlined"
        label="Username"
        error="Username is already taken"
      />
    </div>
  )
}
```

### Dialogs

```tsx
import {
  MD3Dialog,
  MD3DialogTrigger,
  MD3DialogContent,
  MD3DialogHeader,
  MD3DialogTitle,
  MD3DialogDescription,
  MD3DialogFooter,
  MD3DialogIcon,
} from '@/components/md3/dialog'
import { MD3Button } from '@/components/md3/button'

export function DialogExample() {
  return (
    <MD3Dialog>
      <MD3DialogTrigger asChild>
        <MD3Button>Open Dialog</MD3Button>
      </MD3DialogTrigger>
      <MD3DialogContent>
        <MD3DialogIcon icon="delete" />
        <MD3DialogHeader>
          <MD3DialogTitle>Delete item?</MD3DialogTitle>
          <MD3DialogDescription>
            This action cannot be undone. This will permanently delete the item.
          </MD3DialogDescription>
        </MD3DialogHeader>
        <MD3DialogFooter>
          <MD3Button variant="text">Cancel</MD3Button>
          <MD3Button variant="text">Delete</MD3Button>
        </MD3DialogFooter>
      </MD3DialogContent>
    </MD3Dialog>
  )
}
```

### Navigation

```tsx
import {
  MD3NavigationBar,
  MD3NavigationBarItem,
} from '@/components/md3/navigation-bar'
import { MaterialIcon } from '@/components/ui/material-icon'

export function NavigationExample() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <MD3NavigationBar>
      <MD3NavigationBarItem
        icon={<MaterialIcon icon="home" />}
        activeIcon={<MaterialIcon icon="home" filled />}
        label="Home"
        active={activeTab === 'home'}
        onClick={() => setActiveTab('home')}
      />
      <MD3NavigationBarItem
        icon={<MaterialIcon icon="search" />}
        activeIcon={<MaterialIcon icon="search" filled />}
        label="Search"
        active={activeTab === 'search'}
        onClick={() => setActiveTab('search')}
        badge={5}
      />
      <MD3NavigationBarItem
        icon={<MaterialIcon icon="person" />}
        activeIcon={<MaterialIcon icon="person" filled />}
        label="Profile"
        active={activeTab === 'profile'}
        onClick={() => setActiveTab('profile')}
      />
    </MD3NavigationBar>
  )
}
```

### Snackbar

```tsx
import { MD3Snackbar, useMD3Snackbar } from '@/components/md3/snackbar'
import { MD3Button } from '@/components/md3/button'

export function SnackbarExample() {
  const { snackbar, showSnackbar, hideSnackbar } = useMD3Snackbar()

  return (
    <div>
      <MD3Button
        onClick={() =>
          showSnackbar('Item saved successfully', {
            label: 'Undo',
            onClick: () => console.log('Undo clicked'),
          })
        }
      >
        Show Snackbar
      </MD3Button>

      <MD3Snackbar
        open={snackbar.open}
        onOpenChange={hideSnackbar}
        message={snackbar.message}
        action={snackbar.action}
      />
    </div>
  )
}
```

## 🔄 Migration Strategy

### Phase 1: Parallel Implementation (Week 1-2)

1. Keep existing shadcn/ui components
2. Add MD3 components alongside
3. Use feature flags to test MD3 components

```typescript
// lib/feature-flags.ts
export const featureFlags = {
  useMD3Components: process.env.NEXT_PUBLIC_USE_MD3 === 'true',
}

// In your component
import { featureFlags } from '@/lib/feature-flags'
import { Button } from '@/components/ui/button' // shadcn
import { MD3Button } from '@/components/md3/button' // MD3

export function MyComponent() {
  const ButtonComponent = featureFlags.useMD3Components ? MD3Button : Button
  
  return <ButtonComponent>Click me</ButtonComponent>
}
```

### Phase 2: Gradual Migration (Week 3-4)

1. Migrate high-traffic pages first
2. Test thoroughly
3. Update one component type at a time

```typescript
// Create a migration tracking file
// docs/md3-migration-progress.md

## Migration Progress

### Completed
- ✅ Landing page buttons
- ✅ Dashboard cards
- ✅ Settings form inputs

### In Progress
- 🔄 Navigation components
- 🔄 Dialog modals

### Not Started
- ⏳ Admin panel
- ⏳ Profile pages
```

### Phase 3: Cleanup (Week 5-6)

1. Remove old shadcn/ui components
2. Update imports across codebase
3. Remove feature flags

## 🎨 Theming

### Custom Color Palette

To customize colors, edit `lib/design-system/md3-tokens.ts`:

```typescript
export const md3Colors = {
  light: {
    primary: '#YOUR_PRIMARY_COLOR',
    onPrimary: '#FFFFFF',
    primaryContainer: '#YOUR_PRIMARY_CONTAINER',
    // ... rest of colors
  },
  dark: {
    // ... dark theme colors
  },
}
```

### Dynamic Theme Switching

```tsx
'use client'

import { useMD3Theme } from '@/components/providers/md3-theme-provider'
import { MD3Button } from '@/components/md3/button'
import { MaterialIcon } from '@/components/ui/material-icon'

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useMD3Theme()

  return (
    <MD3Button
      variant="text"
      size="icon"
      onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
    >
      <MaterialIcon 
        icon={actualTheme === 'dark' ? 'light_mode' : 'dark_mode'} 
      />
    </MD3Button>
  )
}
```

## ✅ Best Practices

### 1. Use State Layers for Interactive Elements

MD3 components include state layers by default. For custom interactive elements:

```tsx
<div className="md3-state-layer cursor-pointer rounded-md3-lg p-4">
  Interactive content
</div>
```

### 2. Follow Typography Scale

Use MD3 typography utilities:

```tsx
<h1 className="md3-headline-large">Headline Large</h1>
<p className="md3-body-medium">Body text</p>
<span className="md3-label-small">Label</span>
```

### 3. Use Proper Motion

Apply MD3 motion tokens:

```tsx
<div className="transition-all duration-md3-medium2 ease-md3-emphasized">
  Animated content
</div>
```

### 4. Respect Elevation

Use MD3 elevation levels:

```tsx
<div className="shadow-md3-2">Level 2 elevation</div>
```

### 5. Maintain Accessibility

- Always include proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers
- Maintain sufficient color contrast

## 🐛 Troubleshooting

### Components Not Styled Correctly

Ensure Tailwind is processing your component files:

```typescript
// tailwind.config.ts
content: [
  './components/**/*.{ts,tsx}',
  './app/**/*.{ts,tsx}',
]
```

### Icons Not Showing

Verify Material Symbols font is loaded in `globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
```

### Dark Mode Not Working

Ensure the theme provider is wrapping your app in `layout.tsx` and the `html` tag has `suppressHydrationWarning`.

## 📖 Additional Resources

- [Material Design 3 Guidelines](https://m3.material.io/)
- [Material Symbols](https://fonts.google.com/icons)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## 🤝 Contributing

When adding new components:

1. Follow the existing component structure
2. Use `cva` for variant management
3. Include proper TypeScript types
4. Add JSDoc comments
5. Update this documentation
