# BleSaf Branch Manager Dashboard - Mockup Documentation

**Author:** Manus AI
**Date:** February 8, 2026

## Overview

This document explains the visual mockup design for the redesigned BleSaf Branch Manager Dashboard. The mockup demonstrates the hierarchical organization of information, insights, and actions based on the Action-Centric Dashboard Design (ACDD) principles.

## Dashboard Layout Structure

### 1. Header Section
**Purpose:** Navigation and context
**Components:**
- Bank logo and branch identifier ("UIB - Agence Lac 2")
- Current time display
- Language selector (FR/AR)
- User profile menu (Branch Manager name and avatar)

### 2. Hero Metrics Section (Tier 1)
**Purpose:** Immediate at-a-glance assessment of branch operational health
**Location:** Top 20% of screen, always visible

#### Metric 1: Queue Health Score
- **Visual:** Large circular gauge (0-100)
- **Current Value:** 92 (Excellent)
- **Color:** Green (80-100), Amber (60-79), Red (0-59)
- **Indicator:** Upward arrow showing positive trend
- **Why It Matters:** Single composite metric combining wait time, queue length, and SLA compliance for instant status assessment

#### Metric 2: Capacity Utilization
- **Visual:** Circular gauge showing percentage
- **Current Value:** 85% (Adequate)
- **Color:** Green
- **Status Label:** "Adequate" indicates balanced staffing
- **Why It Matters:** Shows if current service rate matches customer arrival rate

#### Metric 3: SLA Compliance Trajectory
- **Visual:** Circular gauge with dual values
- **Current Value:** 100% (current) → 87% (projected)
- **Color:** Amber (warning)
- **Indicator:** Downward arrow showing deteriorating trend
- **Alert:** "Warning: SLA at Risk"
- **Why It Matters:** Proactive warning that SLA will be breached if no action is taken

#### Metric 4: Next Critical Action
- **Visual:** Large prominent card with amber/orange background
- **Current Recommendation:** "Open Counter 3 in 15 min"
- **Action Button:** "EXECUTE ACTION →"
- **Why It Matters:** Tells manager exactly what to do next, eliminating decision paralysis

### 3. Operational Context Section (Tier 2)
**Purpose:** Provide diagnostic insights explaining the "why" behind hero metrics
**Location:** Middle 15% of screen, always visible

#### Panel 1: Service Breakdown
- **Visual:** Horizontal bar chart
- **Data Displayed:**
  - Dépôt d'espèces: 5 waiting (longest bar) ⚠️ Warning icon
  - Retrait d'espèces: 2 waiting (medium bar)
  - Relevés: 1 waiting (short bar)
- **Why It Matters:** Immediately identifies which services are bottlenecked

#### Panel 2: Counter Performance
- **Visual:** Counter status cards
- **Data Displayed:**
  - **Counter G1:** 8 tickets/hr ⚡ (Fast - green icon with upward arrow)
    - Status: Active | High Speed
  - **Counter G2:** 6 tickets/hr ⚠️ (Slow - amber icon with downward arrow)
    - Status: Active | Low Speed
- **Why It Matters:** Identifies high and low performers for resource optimization

#### Panel 3: Predicted Demand
- **Visual:** Large number with warning icon
- **Data Displayed:**
  - **Forecast:** 15-18 customers ⚠️
  - **Label:** "Customers Expected Next Hour"
  - **Context:** "Based on historical data. Prepare resources."
- **Why It Matters:** Enables proactive staffing decisions before rush begins

### 4. Main Content Section (Tier 3)
**Purpose:** Detailed operational view with actionable information
**Location:** Bottom 60% of screen, scrollable if needed

#### Left Column: Queue List (Enhanced)

**Service Group Header:**
- **DÉPÔT D'ESPÈCES (5, avg 12 min)** with warning icon
- Shows total waiting and average wait time at a glance

**Ticket Cards (Enhanced):**
- **D-001** (Highlighted with amber background)
  - Customer: Jean Dupont
  - Wait Time: 15 min
  - **SLA Risk Badge** (orange)
  - Alert icon indicating immediate attention needed
  
- **D-002 through D-005**
  - Customer names
  - Wait times (11 min, 9 min, 6 min, 3 min)
  - Clean, scannable format

**Action Button:**
- "View All Tickets" at bottom for full queue view

#### Right Column: Counters & Actions

**Counter Status Cards:**
- **Counter G3** (Inactive)
  - Status indicator (gray circle)
  - Action button: "Open Counter"
  
- **Counter G4** (Active)
  - Status indicator (green circle)
  - Currently serving: D-000
  - Action button: "View Details"

**Quick Actions Panel:**
- 👥 Assign Staff
- ≡ Adjust Priorities
- ✉️ Send Notification
- 📄 Generate Report

### 5. Alert & Recommendations Panel (Tier 4)
**Purpose:** Contextual intelligent recommendations powered by AI
**Location:** Appears at bottom when conditions warrant attention

#### Critical Alert Banner
- **Visual:** Full-width red banner
- **Icon:** ⚠️ Warning triangle
- **Message:** "SLA RISK ALERT - 3 customers at risk of breaching SLA threshold"
- **Purpose:** Immediate attention grabber for critical situations

#### AI-Powered Recommendations Panel
**Header:** "AI-Powered Recommendations" with sparkle icon
**Footer:** "Powered by Ollama LLM | Last updated: 2 minutes ago"

**Recommendation Card 1 (High Priority - Red Border):**
- **Title:** "Open Counter 3 for Dépôt d'espèces"
- **Impact Metrics:**
  - Reduce avg wait from 12 min to 6 min
  - Affected customers: 5
  - Confidence: 94%
- **Actions:**
  - Primary button: "Execute Now" (blue)
  - Secondary button: "Schedule for Later" (gray)

**Recommendation Card 2 (Medium Priority - Amber Border):**
- **Title:** "Reassign Teller G2 to Dépôt Service"
- **Impact Metrics:**
  - Reduce backlog by 15%
  - Affected services: 2
  - Confidence: 88%
- **Action:**
  - Button: "Simulate Impact" (amber)

**Recommendation Card 3 (Low Priority - Gray Border):**
- **Title:** "Schedule breaks during 2:45-3:15 PM low-demand window"
- **Impact Metrics:**
  - Optimize resource utilization
  - Projected load: Low
  - Confidence: 97%
- **Action:**
  - Button: "Review Schedule" (gray)

## Design Principles Applied

### Visual Hierarchy
1. **Size:** Most important metrics (hero metrics) are largest
2. **Position:** Critical information at top, details below
3. **Color:** Red for critical, amber for warning, green for positive, blue for neutral
4. **Contrast:** High-priority items have stronger visual weight

### Color System
| Color | Hex Code | Usage |
|-------|----------|-------|
| Primary Blue | #1E3A8A | Headers, primary actions, branding |
| Success Green | #10B981 | Positive metrics, healthy status |
| Warning Amber | #F59E0B | Attention needed, medium priority |
| Critical Red | #EF4444 | Urgent alerts, SLA risks |
| Neutral Gray | #6B7280 | Low priority, inactive elements |
| White | #FFFFFF | Card backgrounds, clean space |

### Typography
- **Headers:** Bold, large (24-32px)
- **Metrics:** Extra large, bold (48-64px)
- **Body Text:** Regular, readable (14-16px)
- **Labels:** Small, uppercase (12px)

### Spacing & Layout
- **Card-based design:** Each section is a distinct card with shadow
- **Consistent padding:** 16-24px within cards
- **Grid system:** 4-column layout for hero metrics, 3-column for operational context
- **Whitespace:** Generous spacing prevents visual clutter

## Responsive Behavior

### Desktop (>1440px)
- Full 4-column layout for hero metrics
- Side-by-side queue list and counter actions

### Tablet (768-1440px)
- 2x2 grid for hero metrics
- Stacked queue list and counter actions

### Mobile (Considerations)
- Single column layout
- Collapsible sections
- Swipeable cards for recommendations

## Interaction Patterns

### Hover States
- Cards lift slightly with shadow increase
- Buttons show color transition
- Tooltips appear with additional context

### Click Actions
- Metric cards expand to show detailed breakdown
- Action buttons trigger confirmation modals for critical actions
- Recommendation cards can be dismissed or snoozed

### Real-Time Updates
- Metrics update via WebSocket without page refresh
- Smooth number transitions (count-up animations)
- Pulse animation on new alerts

## Accessibility Considerations

- **Color Blindness:** Icons supplement color coding
- **Screen Readers:** Proper ARIA labels on all interactive elements
- **Keyboard Navigation:** Tab order follows visual hierarchy
- **High Contrast Mode:** Text remains readable

## Implementation Notes

### Frontend Framework
- **Recommended:** React with TypeScript
- **UI Library:** Tailwind CSS for styling, Shadcn/ui for components
- **Charts:** Recharts or Chart.js for visualizations
- **State Management:** React Query for real-time data

### Real-Time Updates
- WebSocket connection for live queue updates
- Optimistic UI updates for immediate feedback
- Polling fallback for LLM recommendations (every 2 minutes)

### Performance
- Lazy load detailed views
- Virtualize long queue lists
- Debounce rapid updates to prevent UI jank

## Next Steps

This mockup serves as the visual foundation for the technical implementation. The next phase involves:
1. Creating the technical architecture for LLM integration
2. Developing API specifications for recommendation engine
3. Building prototype components
4. User testing and iteration
