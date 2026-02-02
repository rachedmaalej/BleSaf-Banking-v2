# Changelog

All notable changes to BléSaf Banking Queue Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.24.0] - 2026-02-02

### Summary
Major Branch Manager dashboard redesign with SG style guidelines, teller break management, and improved token refresh handling.

### Added

#### BM Dashboard Redesign (`apps/web/src/pages/manager/BranchDashboard.tsx`)
- **Alerts Banner** - Real-time alerts for queue issues, slow tellers, closed counters, overtime breaks
- **Today's Scorecard** - Key metrics (waiting, served, avg wait, service rate, rank) with trend indicators
- **Teller Leaderboard** - Performance ranking with customers served, avg service time, slow teller warnings
- **Branch Ranking** - Competitive view across all tenant branches with gap to leader
- **Counter Control Panel** - Open/close counters, assign tellers, start/end breaks

#### Teller Break Management System
- **New `TellerBreak` model** in Prisma schema for tracking breaks
- **New counter status** `on_break` added to `CounterStatus` enum
- **Break API endpoints** (`apps/api/src/routes/breaks.ts`):
  - `POST /api/breaks/start` - Start a teller break
  - `POST /api/breaks/:id/end` - End a break
  - `PATCH /api/breaks/:id/extend` - Extend break duration
  - `GET /api/breaks/branch/:id` - Get all breaks for branch
  - `GET /api/breaks/counter/:id` - Get active break for counter
  - `GET /api/breaks/reasons` - Get break reason options
- **Break service** (`apps/api/src/services/breakService.ts`) with business logic
- **Break UI components** - BreakModal, BreakTimer with countdown

#### Analytics API Enhancements
- `GET /api/analytics/branch/:id/comparison` - Today vs yesterday stats
- `GET /api/analytics/tenant/ranking` - Branch ranking across tenant

#### Documentation
- **Lean `CLAUDE.md`** - Essential project info loaded every session
- **`docs/API-REFERENCE.md`** - Complete API endpoint documentation
- **`docs/DATA-MODEL.md`** - Database schema reference
- **`docs/BM-ENHANCEMENT-PLAN.md`** - Future roadmap for BM features
- **`docs/design-system.md`** - SG brand styling guide

### Changed

#### Token Refresh Queue (`apps/web/src/lib/api.ts`)
- Fixed race condition when multiple parallel requests get 401
- Implemented refresh queue - only one refresh happens at a time
- Other requests wait for refresh to complete, then retry with new token

#### Login Page (`apps/web/src/pages/auth/LoginPage.tsx`)
- Updated styling to follow SG brand guidelines

### Fixed
- **Breaks API middleware** - Fixed `requireBranchAccess()` factory function call (was missing parentheses)
- **Dashboard loading** - Breaks fetch is now truly non-blocking (uses `.then()` instead of `await`)

### Files Modified
| File | Description |
|------|-------------|
| `apps/web/src/pages/manager/BranchDashboard.tsx` | Complete redesign with SG style |
| `apps/web/src/lib/api.ts` | Token refresh queue, breaks API |
| `apps/api/src/routes/breaks.ts` | New break management routes |
| `apps/api/src/services/breakService.ts` | Break business logic |
| `apps/api/src/routes/analytics.ts` | Comparison and ranking endpoints |
| `apps/api/src/services/analyticsService.ts` | Analytics queries |
| `apps/api/prisma/schema.prisma` | TellerBreak model, on_break status |
| `packages/shared/src/constants.ts` | ON_BREAK counter status |
| `packages/shared/src/types.ts` | Break-related types |

---

## [0.22.0] - 2026-02-02

### Summary
Redesigned login page with SG style guidelines.

### Changed
- Login page UI updated to follow Société Générale brand colors and styling

---

## [0.2.0] - 2025-02-02

### Summary
Simplified teller workflow and synchronized global FIFO queue across all screens.

### Changed

#### Teller Workflow Simplification
- **Removed "Start Service" button** - Tickets now transition directly from `WAITING` → `SERVING` when called
- Reduced teller workflow from 3 clicks to 2 clicks:
  - Before: Call Next → Start Service → Complete/No-Show
  - After: Call Next → Complete/No-Show
- Service timer starts immediately when customer is called
- SMS "your turn" notification still sent on call

#### Backend Changes (`apps/api/src/services/queueService.ts`)
- `callNextTicket()` now sets both `calledAt` and `servingStartedAt` in same transaction
- `callNextTicketByService()` updated with same behavior
- `markNoShow()` now accepts tickets in either `CALLED` or `SERVING` status
- Added `autoServing: true` flag in audit log metadata for traceability
- Emits both `TICKET_CALLED` and `TICKET_SERVING` socket events for compatibility

#### Global FIFO Queue Sync
- Added `globalQueue` field to `TellerQueueView` interface (`packages/shared/src/types.ts`)
- Added `totalWaitingInBranch` counter for accurate queue counts
- All teller screens now display the same FIFO queue in footer
- Queue updates in real-time when any teller calls a customer

#### Queue Order Consistency
- Fixed TV Display (`QueueDisplay.tsx`) to use backend-sorted `waitingTickets`
- Removed incorrect alphabetical sorting by ticket number
- Both TV Display and Teller footer now show identical queue order (priority DESC, createdAt ASC)

#### Optimistic Updates (`apps/web/src/stores/queueStore.ts`)
- Fixed `callNext()` to properly remove called ticket from `globalQueue`
- Fixed `callNextByService()` with same optimization
- Added `totalWaitingInBranch` decrement on optimistic updates

### Added

#### Responsive Design (`apps/web/src/pages/teller/TellerDashboard.tsx`)
- Made TellerDashboard fully responsive with Tailwind breakpoints
- Footer shows 3 tickets on mobile, 6 on larger screens
- Proper grid layouts for different screen sizes (sm, md, lg)
- Mobile-optimized button sizes and spacing

### Files Modified
| File | Description |
|------|-------------|
| `packages/shared/src/types.ts` | Added `globalQueue` and `totalWaitingInBranch` to TellerQueueView |
| `apps/api/src/services/queueService.ts` | Auto-start serving on call, global queue query |
| `apps/web/src/stores/queueStore.ts` | Fixed optimistic updates for globalQueue |
| `apps/web/src/pages/teller/TellerDashboard.tsx` | Responsive layout, global queue footer |
| `apps/web/src/pages/display/QueueDisplay.tsx` | Fixed queue sorting |

---

## [0.1.0] - 2025-01-28

### Summary
Initial release of BléSaf Banking Queue Management System.

### Added

#### Core Features
- **Kiosk Interface** - Touch-screen service selection for customers
  - Service selection screen with 4 categories (Retrait, Dépôt, Ouverture de compte, Autres)
  - Phone number input for SMS notifications
  - Ticket confirmation with QR code
  - French/Arabic language toggle

- **TV Display** - Public queue display for branch lobbies
  - Shows active counters with current ticket being served
  - Displays waiting queue with ticket numbers
  - Real-time updates via Socket.io
  - Multi-counter support (up to 5 guichets)

- **Teller Dashboard** - Agent interface for serving customers
  - Current ticket display with service timer
  - Next ticket preview
  - Call Next, Complete, No-Show actions
  - Queue footer showing waiting tickets

- **Manager Dashboard** - Branch management interface
  - Queue overview and statistics
  - Counter management
  - Service configuration

- **Admin Panel** - System administration
  - Clinic/Branch management
  - User management
  - Service category configuration

#### Technical Infrastructure
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.io for live updates
- **i18n**: French and Arabic with RTL support

#### Design System
- Material Design 3 (MD3) inspired components
- Helvetica Neue LT Pro typography
- Service-specific color coding:
  - Retrait (Withdrawal): Cyan `#0891B2`
  - Dépôt (Deposit): Green `#65A30D`
  - Ouverture de compte: Orange `#D97706`
  - Autres: Gray `#6B7280`

### Database Schema
- `Clinic` - Multi-tenant clinic/branch configuration
- `Branch` - Physical branch locations
- `Counter` - Service counters (guichets)
- `ServiceCategory` - Service types with prefixes
- `Ticket` - Queue tickets with status tracking
- `User` - Staff accounts with roles (admin, manager, teller)

---

## Planned Features

### [0.3.0] - Planned
- [ ] SMS notifications via Twilio
- [ ] WhatsApp Business API integration
- [ ] Customer feedback collection
- [ ] Advanced analytics dashboard

### [0.4.0] - Planned
- [ ] Appointment scheduling
- [ ] Priority queue for special customers
- [ ] Multi-branch queue balancing
- [ ] Mobile app for customers

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 0.24.0 | 2026-02-02 | BM dashboard redesign, break management, token refresh fix |
| 0.22.0 | 2026-02-02 | Login page SG styling |
| 0.2.0 | 2025-02-02 | Simplified teller workflow, global queue sync |
| 0.1.0 | 2025-01-28 | Initial release |

---

## Contributing

When making changes:
1. Update this CHANGELOG with your changes under "Unreleased"
2. Follow the format: Added, Changed, Deprecated, Removed, Fixed, Security
3. Include file references for significant changes
4. Move "Unreleased" changes to a new version section when releasing
