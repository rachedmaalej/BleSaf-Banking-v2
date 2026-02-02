# Claude Code Implementation Instructions

## 🎯 Quick Start with Claude Code

This guide provides step-by-step instructions for implementing Material Design 3 in your Next.js project using Claude Code (Visual Studio Code).

## 📦 Package Installation

Open your terminal in Claude Code and run:

```bash
# Navigate to your frontend package (adjust path based on your monorepo structure)
cd apps/web

# Install required dependencies
pnpm add @radix-ui/react-dialog @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-switch @radix-ui/react-slider class-variance-authority clsx tailwind-merge

# If you don't have tailwindcss-animate
pnpm add -D tailwindcss-animate
```

## 📁 File Structure Setup

Your project should have this structure:

```
apps/web/
├── app/
│   ├── globals.css                    ← Update this
│   └── layout.tsx                     ← Update this
├── components/
│   ├── md3/                          ← New folder
│   │   ├── button.tsx
│   │   ├── fab.tsx
│   │   ├── card.tsx
│   │   ├── text-field.tsx
│   │   ├── chip.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── switch.tsx
│   │   ├── slider.tsx
│   │   ├── progress.tsx
│   │   ├── dialog.tsx
│   │   ├── snackbar.tsx
│   │   ├── top-app-bar.tsx
│   │   ├── navigation-bar.tsx
│   │   └── index.ts
│   ├── providers/                    ← New folder
│   │   └── md3-theme-provider.tsx
│   └── ui/
│       └── material-icon.tsx         ← New file
├── lib/
│   ├── design-system/                ← New folder
│   │   └── md3-tokens.ts
│   └── utils.ts                      ← Ensure this exists
└── tailwind.config.ts                ← Update this
```

## 🚀 Implementation Steps

### Step 1: Create Folders

```bash
# In your terminal (apps/web directory)
mkdir -p lib/design-system
mkdir -p components/md3
mkdir -p components/providers
mkdir -p components/ui
```

### Step 2: Copy Design Tokens

Copy the contents of `lib/design-system/md3-tokens.ts` from the implementation files to your project.

**In Claude Code:**
1. Open `apps/web/lib/design-system/md3-tokens.ts` (create if needed)
2. Paste the entire content from the provided file
3. Save (Ctrl+S / Cmd+S)

### Step 3: Update Tailwind Config

Replace your `tailwind.config.ts` with the provided MD3 version.

**Important**: If you have custom Tailwind settings, merge them carefully:
- Keep your existing `content` paths
- Merge the `extend` sections
- Keep any custom plugins you've added

### Step 4: Update Global CSS

**In Claude Code:**
1. Open `apps/web/app/globals.css`
2. Replace with the provided MD3 globals.css
3. If you have custom global styles, add them at the end

### Step 5: Add Theme Provider

1. Create `components/providers/md3-theme-provider.tsx`
2. Paste the provided content
3. Save

### Step 6: Update Root Layout

**In Claude Code:**
1. Open `apps/web/app/layout.tsx`
2. Add the import: `import { MD3ThemeProvider } from '@/components/providers/md3-theme-provider'`
3. Wrap your children with the provider (see README for example)

### Step 7: Add Material Icon Component

1. Create `components/ui/material-icon.tsx`
2. Paste the provided content
3. Save

### Step 8: Add MD3 Components

For each component file in `components/md3/`:
1. Create the file
2. Paste the content
3. Save

**Tip**: Use Claude Code's multi-file editing:
- Ctrl+P (Cmd+P on Mac) to quick-open files
- Create and paste one at a time

### Step 9: Create Utils Helper (if needed)

If you don't have `lib/utils.ts`:

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Step 10: Verify Installation

Create a test page to verify everything works:

```typescript
// app/test-md3/page.tsx
import { MD3Button } from '@/components/md3/button'
import { MD3Card, MD3CardHeader, MD3CardTitle, MD3CardContent } from '@/components/md3/card'
import { MaterialIcon } from '@/components/ui/material-icon'

export default function TestMD3Page() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="md3-headline-large">MD3 Test Page</h1>
      
      <div className="flex gap-4">
        <MD3Button variant="filled">Filled</MD3Button>
        <MD3Button variant="outlined">Outlined</MD3Button>
        <MD3Button variant="text">Text</MD3Button>
      </div>

      <MD3Card>
        <MD3CardHeader>
          <MD3CardTitle>Test Card</MD3CardTitle>
        </MD3CardHeader>
        <MD3CardContent>
          If you can see this styled correctly, MD3 is working! ✅
        </MD3CardContent>
      </MD3Card>
    </div>
  )
}
```

**Test the page:**
1. Start your dev server: `pnpm dev`
2. Navigate to `http://localhost:3000/test-md3`
3. Verify components render correctly

## 🔧 Troubleshooting in Claude Code

### Issue: Module not found errors

**Solution:**
1. Check your `tsconfig.json` has correct path aliases:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

2. Restart TypeScript server:
   - Ctrl+Shift+P (Cmd+Shift+P on Mac)
   - Type "TypeScript: Restart TS Server"
   - Select it

### Issue: Tailwind classes not working

**Solution:**
1. Check that `tailwind.config.ts` includes the right content paths
2. Restart dev server
3. Clear `.next` cache: `rm -rf .next && pnpm dev`

### Issue: Icons not showing

**Solution:**
1. Check `globals.css` has the Google Fonts import
2. Check network tab in browser DevTools for font loading
3. Try a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Issue: TypeScript errors

**Solution:**
1. Ensure all dependencies are installed
2. Check `lib/utils.ts` exists with the `cn` function
3. Restart TypeScript server (see above)

## 🎨 Customizing Colors

### Option 1: Using MD3 Material Theme Builder

1. Visit [Material Theme Builder](https://m3.material.io/theme-builder)
2. Choose your primary color
3. Export the theme
4. Update `lib/design-system/md3-tokens.ts` with new colors

### Option 2: Manual Color Updates

Edit `lib/design-system/md3-tokens.ts`:

```typescript
export const md3Colors = {
  light: {
    primary: '#YOUR_BRAND_COLOR', // Change this
    // ... update other colors
  },
}
```

**Tip**: After changing colors:
1. Save the file
2. The dev server will hot-reload
3. Check your test page to verify

## 📝 Git Workflow

### Initial Commit

```bash
# Create a new branch for MD3 implementation
git checkout -b feature/material-design-3

# Stage all new files
git add .

# Commit
git commit -m "feat: Add Material Design 3 foundation

- Add MD3 design tokens and Tailwind config
- Add theme provider for light/dark mode
- Add core MD3 components (buttons, cards, inputs, etc.)
- Update global styles with MD3 specifications
- Add Material Symbols icon integration

Refs: #[ISSUE_NUMBER]"

# Push to remote
git push origin feature/material-design-3
```

### Creating Savepoint (Beta Version)

```bash
# When you reach a stable state
git add .
git commit -m "chore: Beta 1.0 - Stable MD3 implementation"
git tag -a v1.0-beta -m "Beta version 1.0 - MD3 fully integrated"
git push origin feature/material-design-3 --tags
```

## 🚦 Feature Flag Setup

Create a feature flag file:

```typescript
// lib/feature-flags.ts
export const featureFlags = {
  useMD3: process.env.NEXT_PUBLIC_USE_MD3 === 'true',
}
```

Add to `.env.local`:
```
NEXT_PUBLIC_USE_MD3=true
```

Usage example:
```typescript
import { featureFlags } from '@/lib/feature-flags'
import { Button } from '@/components/ui/button' // Old
import { MD3Button } from '@/components/md3/button' // New

export function MyComponent() {
  const ButtonComponent = featureFlags.useMD3 ? MD3Button : Button
  return <ButtonComponent>Click me</ButtonComponent>
}
```

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All components render correctly in light mode
- [ ] All components render correctly in dark mode
- [ ] No console errors or warnings
- [ ] TypeScript compilation passes with no errors
- [ ] Build succeeds: `pnpm build`
- [ ] Visual regression testing completed
- [ ] Accessibility testing completed
- [ ] Mobile testing completed
- [ ] Performance metrics acceptable

## 🔗 Quick Links

- [README.md](./README.md) - Full documentation
- [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md) - Detailed migration plan
- [Material Design 3 Guidelines](https://m3.material.io/)

## 💡 Tips for Claude Code

1. **Use Multiple Cursors**: Alt+Click (Option+Click on Mac) to add cursors for bulk editing
2. **Quick File Navigation**: Ctrl+P (Cmd+P) to quickly open files
3. **Search Across Files**: Ctrl+Shift+F (Cmd+Shift+F) to find component usage
4. **Rename Symbol**: F2 to rename across all files
5. **Format on Save**: Enable in Settings → Text Editor → Format On Save

## 🎓 Next Steps

1. Review the [README.md](./README.md) for detailed component usage
2. Check the [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md) for implementation timeline
3. Start with high-priority components (buttons, cards, inputs)
4. Test thoroughly before rolling out to production
5. Gather team feedback and iterate

Happy coding! 🚀
