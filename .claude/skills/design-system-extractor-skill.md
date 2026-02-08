# Design System Extractor Skill

## Purpose
This skill helps Claude analyze existing UI code to extract, document, and standardize design patterns, creating a comprehensive design playbook for maintaining visual consistency across an application.

## When to Use This Skill
- After developing several screens/components in a project
- When you notice design inconsistencies creeping in
- Before scaling UI development to new screens
- When onboarding new developers to maintain design coherence

## Skill Workflow

### Phase 1: Discovery & Inventory

**Step 1: Scan the Codebase**
```bash
# Identify all UI component files
find src -name "*.jsx" -o -name "*.tsx" -o -name "*.vue" -o -name "*.svelte"

# Identify style files
find src -name "*.css" -o -name "*.scss" -o -name "*.module.css"
```

**Step 2: Catalog Components**
Create an inventory of:
- All React/Vue/Svelte components
- Page layouts
- Reusable UI elements
- Form components
- Navigation elements

**Step 3: Extract Design Tokens**
Analyze code for:
- Color values (hex, rgb, css variables)
- Font families, sizes, weights
- Spacing values (margins, padding, gaps)
- Border radius values
- Shadow definitions
- Breakpoint values
- Z-index layers

### Phase 2: Pattern Analysis

**Step 4: Identify Common Patterns**
Look for repeated patterns in:
- Button variants (primary, secondary, ghost, danger)
- Input field styles
- Card layouts
- Modal/dialog structures
- Typography hierarchy (h1-h6, body, caption)
- Icon usage and sizing
- Animation/transition patterns

**Step 5: Document Inconsistencies**
Flag variations that should be standardized:
- Multiple shade variations of similar colors
- Inconsistent spacing scales
- Font size inconsistencies
- Border radius variations

### Phase 3: Playbook Creation

**Step 6: Generate Design System Documentation**

Create a structured document with these sections:

#### A. Color Palette
```javascript
// Primary Colors
const colors = {
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    // ... full scale
    900: '#0d47a1'
  },
  secondary: { /* ... */ },
  neutral: { /* ... */ },
  semantic: {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3'
  }
}
```

#### B. Typography Scale
```css
/* Font Families */
--font-primary: 'Inter', sans-serif;
--font-heading: 'Poppins', sans-serif;
--font-mono: 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### C. Spacing Scale
```css
/* Based on 4px base unit */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

#### D. Component Specifications

**Button Component**
```jsx
// Variants
- Primary: bg-primary text-white hover:bg-primary-dark
- Secondary: bg-secondary text-white hover:bg-secondary-dark
- Outline: border-2 border-primary text-primary hover:bg-primary-light
- Ghost: text-primary hover:bg-gray-100

// Sizes
- sm: px-3 py-1.5 text-sm
- md: px-4 py-2 text-base (default)
- lg: px-6 py-3 text-lg

// States
- Default: opacity-100
- Hover: opacity-90 transform scale-105
- Active: opacity-80
- Disabled: opacity-50 cursor-not-allowed
- Loading: opacity-70 with spinner

// Borders & Shadows
- border-radius: 6px (--radius-md)
- shadow: 0 1px 3px rgba(0,0,0,0.1)
```

**Input Field Component**
```jsx
// Base Styles
- border: 1px solid #e0e0e0
- border-radius: 6px
- padding: 10px 12px
- font-size: 14px
- transition: all 0.2s ease

// States
- Focus: border-color: primary, box-shadow: 0 0 0 3px primary-light
- Error: border-color: error, with error message below
- Disabled: background: gray-100, cursor: not-allowed
- Success: border-color: success, with checkmark icon

// Variants
- Default: as above
- With Icon: pl-10 (icon positioned absolute left)
- Textarea: min-height: 100px, resize: vertical
```

#### E. Layout Patterns

**Grid System**
```css
/* Container widths */
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;

/* Grid columns */
- 12-column grid
- Gutter: 24px (--space-6)
```

**Card Component**
```jsx
// Structure
- Container: bg-white, border-radius: 8px, shadow-md
- Padding: 24px (--space-6)
- Header: mb-4, font-semibold, text-lg
- Body: text-base, color: neutral-700
- Footer: mt-6, border-top, pt-4

// Variants
- Elevated: shadow-lg, hover: shadow-xl
- Flat: border: 1px solid gray-200, shadow: none
- Interactive: hover: shadow-lg, cursor: pointer
```

#### F. Animation & Transitions

```css
/* Timing Functions */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

/* Durations */
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;

/* Common Transitions */
transition: all var(--duration-base) var(--ease-in-out);
```

#### G. Iconography Guidelines

```javascript
// Icon sizes
- xs: 12px
- sm: 16px
- md: 20px (default)
- lg: 24px
- xl: 32px

// Icon library: [Specify: Heroicons, Lucide, Material, etc.]
// Color: Inherit from parent or neutral-600
// Usage: Always include aria-label for accessibility
```

### Phase 4: Implementation

**Step 7: Create Centralized Design Token Files**

Generate actual implementation files:

```javascript
// design-tokens.js
export const tokens = {
  colors: { /* extracted colors */ },
  typography: { /* font definitions */ },
  spacing: { /* spacing scale */ },
  borders: { /* radius, widths */ },
  shadows: { /* elevation system */ },
  breakpoints: { /* responsive breakpoints */ },
  transitions: { /* animation configs */ }
};
```

**Step 8: Create Component Library**

Document each component with:
- Props interface/types
- Variant examples
- Usage guidelines
- Accessibility notes
- Code snippets

**Step 9: Generate Style Guide Document**

Create a markdown file or interactive Storybook with:
- Visual examples of each component
- Do's and don'ts
- Accessibility checklist
- Responsive behavior
- Browser support notes

### Phase 5: Maintenance

**Step 10: Create Update Process**

Establish a workflow for:
- Proposing new design tokens
- Deprecating old patterns
- Version control for design system
- Change documentation

## Output Deliverables

1. **design-system.md** - Complete design playbook
2. **design-tokens.js/css** - Centralized token definitions
3. **component-library.md** - Component specifications
4. **usage-examples/** - Code snippets for each pattern
5. **migration-guide.md** - How to refactor existing code to match system

## Example Prompt for Using This Skill

```
I need you to analyze all the UI components in my src/components folder 
and extract a comprehensive design system. Please:

1. Scan all .jsx files in src/components and src/pages
2. Extract all color values, fonts, spacing, and component patterns
3. Identify inconsistencies that should be standardized
4. Create a complete design playbook with:
   - Color palette with proper naming
   - Typography scale
   - Spacing system
   - Component specifications for buttons, inputs, cards, modals
   - Layout patterns
   - Animation guidelines
5. Generate design-tokens.js file I can use going forward
6. Provide recommendations for refactoring inconsistent components

Focus on creating a system that will make future screen development 
faster and more consistent.
```

## Integration with Your Workflow

**For BléSaf or other projects:**

1. Run this skill after you've built 3-5 screens
2. Use the generated playbook as reference for all new screens
3. When Claude Code builds new UI, reference: "Follow the design system in design-system.md"
4. Periodically re-run to catch drift and update the system
5. Share the playbook with any collaborators

## Advanced: Creating a Design System Validator

You can also create a linting rule or pre-commit hook that:
- Checks for hardcoded colors (should use tokens)
- Flags spacing values outside the scale
- Warns about new font sizes not in the system
- Ensures consistent component naming

```javascript
// Example ESLint rule
'no-hardcoded-colors': 'error',
'use-design-tokens': 'warn',
'consistent-spacing': 'error'
```

## Tips for Success

1. **Start with what exists** - Don't over-engineer, extract actual patterns first
2. **Prioritize consistency over perfection** - Better to have 80% adoption of a simple system
3. **Document the why** - Explain reasoning behind design decisions
4. **Make it accessible** - Keep the playbook in your repo, easy to reference
5. **Iterate** - Design systems evolve, plan for updates
6. **Use in practice** - The playbook is only useful if you reference it during development

## Benefits You'll See

- **Faster development** - Less decision-making on spacing, colors, etc.
- **Visual consistency** - All screens feel like part of the same app
- **Easier maintenance** - Update tokens in one place, effect everywhere
- **Better collaboration** - Clear guidelines for anyone working on UI
- **Quality assurance** - Easy to spot deviations from standards
