# BléSaf Banking Queue Management System - Complete Application Description

## What is BléSaf?

**BléSaf** (from Tunisian dialect: "Blé" = sans/without, "Saf" = file/queue — literally "No More Waiting in Line") is a cloud-based, multi-tenant SaaS platform that digitizes and manages customer queues in bank branches across Tunisia and North Africa. It replaces the chaotic, paper-ticket, take-a-number systems still used in most banks with a real-time, intelligent queue orchestration platform.

**The problem it solves:** Bank customers in Tunisia routinely wait 30-60+ minutes with zero visibility into their position, no notifications, and no way to track progress. Branch managers have no operational data — they cannot see which tellers are slow, which services are bottlenecked, or how their branch compares to others. Headquarters has no cross-branch analytics.

**The solution:** BléSaf provides five interconnected interfaces — a customer-facing kiosk for ticket creation, a TV display for the waiting area, a teller dashboard for serving customers, a branch manager dashboard for real-time operations, and an HQ admin panel for multi-branch oversight. All connected via WebSockets for instant, real-time updates across every screen.

---

## Architecture Overview

BléSaf follows a monorepo structure with three workspaces:

```
apps/
  web/          → Frontend (React SPA)
  api/          → Backend (Express REST API + WebSocket server)
packages/
  shared/       → Shared TypeScript types, constants, and validation schemas
```

The system is **multi-tenant by design**: a single deployment serves multiple banks (tenants), each with their own branches, staff, services, and data — fully isolated at the database level via `tenantId` foreign keys on every table.

---

## Tech Stack by Component

### Frontend (`apps/web/`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.2 | Component UI framework |
| **TypeScript** | 5.3 | Type-safe development (strict mode, no `any`) |
| **Vite** | 5.0 | Build tool and dev server (port 5173) |
| **Tailwind CSS** | 3.4 | Utility-first styling (no separate CSS files) |
| **tailwindcss-rtl** | 0.9 | Automatic RTL class support for Arabic |
| **Zustand** | 4.4 | Lightweight state management (replaces Redux) |
| **React Router** | 6.21 | Client-side routing with role-based guards |
| **Socket.IO Client** | 4.7 | Real-time WebSocket connection to backend |
| **Axios** | 1.6 | HTTP client with JWT interceptors and token refresh queue |
| **react-i18next** | 14.0 | Internationalization (French default + Arabic RTL) |
| **react-hook-form** | 7.49 | Form state management and validation |
| **Recharts** | 3.7 | SVG charting for analytics dashboards |
| **qrcode.react** | 3.1 | QR code generation for ticket tracking links |
| **@headlessui/react** | 1.7 | Accessible unstyled UI primitives (modals, dropdowns) |
| **date-fns** + **date-fns-tz** | 3.x | Date manipulation with timezone support (Africa/Tunis) |
| **@sentry/react** | 7.91 | Error tracking and performance monitoring |
| **vite-plugin-pwa** | 0.17 | Progressive Web App with offline caching |
| **Inter** font | — | Latin typography (weights 300-900) |
| **Noto Sans Arabic** font | — | Arabic typography (weights 300-900) |
| **Material Symbols Outlined** | — | Icon system (24px default, variable weight/fill) |

### Backend (`apps/api/`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express** | 4.x | HTTP REST API framework |
| **TypeScript** | 5.3 | Type-safe backend (strict mode) |
| **PostgreSQL** | 15+ | Primary relational database |
| **Prisma** | 5.x | ORM with type-safe queries, migrations, and schema management |
| **Socket.IO** | 4.7 | WebSocket server for real-time broadcasting |
| **Redis** | — | Socket.IO adapter (horizontal scaling) + BullMQ job persistence |
| **BullMQ** | — | Job queue for SMS/WhatsApp notifications and scheduled tasks |
| **JWT** (jsonwebtoken) | — | Stateless authentication (15min access + 7day refresh tokens) |
| **bcrypt** | — | Password hashing (cost factor 10) |
| **Zod** | — | Runtime input validation on all API endpoints |
| **Helmet** | — | HTTP security headers |
| **Twilio** | — | SMS delivery provider |
| **Meta Cloud API** | — | WhatsApp Business messaging |
| **Sentry** | — | Error tracking and performance monitoring |

### Shared Package (`packages/shared/`)

| Content | Purpose |
|---------|---------|
| `types.ts` | All TypeScript interfaces shared between frontend and backend |
| `constants.ts` | Queue limits, rate limits, break reasons, role hierarchy |
| `validation.ts` | Shared Zod schemas for API request/response validation |

---

## Design System

BléSaf follows **Société Générale (SG) brand guidelines** adapted for a banking queue context, with Material Design 3 influences for elevation and component patterns.

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **SG Red** | `#E9041E` | Primary CTAs, critical alerts, brand accent |
| **Black** | `#1A1A1A` | Primary text, secondary buttons |
| **Rose** | `#D66874` | Service accent, soft highlights |
| **Gray** | `#666666` | Secondary text, descriptions |
| **Light Gray** | `#F5F5F5` | Page backgrounds, panels |
| **White** | `#FFFFFF` | Card surfaces |
| **Success Green** | `#10B981` | Open status, completed states |
| **Warning Amber** | `#F59E0B` | Alerts, slow indicators, paused state |

### Service Color Coding

Every service category has an assigned color that threads through the entire UI — on kiosk cards, ticket badges, TV display borders, teller panels, and manager queue lists:

| Service | Color | Icon |
|---------|-------|------|
| Cash Withdrawal (Retrait) | SG Red `#E9041E` | `local_atm` |
| Cash Deposit (Dépôt) | Black `#1A1A1A` | `savings` |
| Account Opening | Rose `#D66874` | `person_add` |
| Loans | Blue | `account_balance` |
| Foreign Exchange | Purple | `currency_exchange` |
| Other | Gray `#666666` | `more_horiz` |

### Typography

- **Latin text**: Inter (weights 300-900)
- **Arabic text**: Noto Sans Arabic (weights 300-900)
- **Display numbers** (ticket numbers, timers): weight 300 (light), tight letter-spacing
- **Body text**: weight 400-500, 14-16px
- **Headings**: weight 600-700, 20-28px
- **Kiosk/TV display**: weight 300-600, 48-96px

### Component Patterns

- **Cards**: `bg-white rounded-xl shadow-sm border border-gray-200 p-5`
- **Buttons**: `px-6 py-3 rounded-lg font-semibold` with brand color backgrounds
- **Badges**: Rounded-full pills with light-colored backgrounds and darker text
- **Status dots**: 8px colored circles (green=open, amber=break, gray=closed, red=alert)
- **Icons**: Material Symbols Outlined at 24px default (18px in buttons, 48-64px in empty states)
- **Spacing**: 4px base unit (Tailwind's spacing scale)

### RTL Support

When the language is switched to Arabic:
- `document.documentElement.dir` switches to `rtl`
- All Tailwind RTL classes activate (`ps-` becomes padding-right, `pe-` becomes padding-left)
- Text alignment, flex direction, and border sides auto-mirror
- Arabic font (Noto Sans Arabic) takes priority in the font stack

---

## Data Model

The database has 14 core tables:

### Multi-Tenancy Layer
- **Tenant**: A bank (e.g., "UIB", "BNA"). Has subdomain, logo, default operating hours, language config, status.
- **Branch**: A physical bank branch. Has name, code (unique per tenant), address, region, timezone, queue status (open/paused/closed), auto-scheduling config (opening/closing times, weekend rules).
- **Counter** (Guichet): A service window within a branch. Has number, label, status (open/closed/on_break), currently assigned teller, currently serving ticket, and active break reference.

### Service Configuration
- **ServiceCategory**: A type of service offered at a branch (e.g., "Retrait d'espèces"). Has French name, Arabic name, ticket prefix ("A", "B", "C"), icon, priority weight, average service time.
- **ServiceTemplate**: A bank-level reusable service definition that can be copied to branches for quick setup.

### Queue & Tickets
- **Ticket**: The core entity. Tracks a customer's journey from check-in to completion. Has ticket number (e.g., "A-042"), status (waiting/called/serving/completed/no_show/cancelled), priority (normal/vip), customer phone, check-in method (kiosk/mobile/manual), assigned counter, serving teller, and precise timestamps (created, called, serving started, completed).
- **TicketHistory**: Complete audit trail. Every state change creates a history entry with action type, actor (user or SYSTEM), timestamp, and metadata JSON.
- **NotificationLog**: Tracks SMS/WhatsApp messages sent per ticket — channel, message type (confirmation/almost_turn/your_turn), delivery status, cost, provider message ID.

### Staff & Auth
- **User**: Staff member with name, email, password hash, role (super_admin/bank_admin/branch_manager/teller), branch assignment, status.
- **RefreshToken**: Stored refresh tokens for JWT auth — enables logout, multi-device tracking, and token revocation.
- **TellerBreak**: Tracks teller breaks with reason (lunch/prayer/personal/urgent), planned duration, actual end time, who started it, who ended it.

### Analytics & Operations
- **DailyBranchStats**: Pre-computed daily aggregates (total tickets, completed, no-shows, avg wait/service times, peak hour).
- **HourlySnapshot**: Time-series data for hourly queue length, active counters, and wait times.
- **BranchTarget**: Daily goals per branch (served target, avg wait target, SLA percentage, SLA threshold minutes).
- **Announcement**: Broadcast messages for TV displays with French/Arabic text, priority, TTS flag, display duration, expiration.

---

## Authentication & Authorization

### JWT Token Flow

1. User logs in with email/password → backend validates credentials via bcrypt
2. Backend issues two tokens:
   - **Access token** (15-minute expiry): Contains `userId`, `tenantId`, `branchId`, `role`
   - **Refresh token** (7-day expiry): Stored in database for revocation control
3. Frontend stores tokens in memory (Zustand store) and attaches access token to every API request via Axios interceptor
4. When access token expires, Axios interceptor automatically calls `/api/auth/refresh` with the refresh token
5. A **refresh queue** prevents race conditions when multiple concurrent requests trigger simultaneous refresh attempts
6. Logout deletes the refresh token from the database, preventing reuse

### Role-Based Access Control (RBAC)

Four-tier role hierarchy where higher roles inherit all lower-role permissions:

```
SUPER_ADMIN (level 4) — Cross-tenant system management
  └─ BANK_ADMIN (level 3) — Single-tenant administration
      └─ BRANCH_MANAGER (level 2) — Single-branch operations
          └─ TELLER (level 1) — Customer service only
```

Enforcement happens via Express middleware:
- `requireRole(...roles)`: Minimum role level check
- `requireBranchAccess()`: Branch managers and tellers can only access data from their assigned branch
- `canManageUser()`: Users can only create/modify users with a lower role level
- All queries are scoped by `tenantId` — no cross-tenant data leakage is possible

---

## Real-Time Architecture (Socket.IO)

Every interface in BléSaf receives instant updates via WebSocket connections. The Socket.IO server uses a **Redis adapter** for horizontal scaling across multiple server instances.

### Room Structure

Clients join rooms based on their role:

| Room Pattern | Who Joins | Purpose |
|-------------|-----------|---------|
| `branch:{branchId}` | Tellers, managers | Staff dashboards — queue changes, counter updates |
| `display:{branchId}` | TV displays, kiosks | Public displays — ticket calls, announcements |
| `ticket:{ticketId}` | Customer mobile view | Individual ticket tracking |

### Event Flow

When a teller calls the next customer:

1. Teller clicks "Call Next" → `POST /api/queue/call-next`
2. Backend finds the next waiting ticket (FIFO, VIP priority first)
3. Backend updates ticket status to `called`, links it to the counter
4. Backend creates a `TicketHistory` audit entry
5. Backend queues a "your turn" SMS/WhatsApp notification
6. Backend broadcasts `ticket:called` event to three rooms:
   - `branch:{branchId}` → all staff dashboards update
   - `display:{branchId}` → TV display shows ticket at counter
   - `ticket:{ticketId}` → customer's mobile tracking page updates
7. All connected clients receive the event within milliseconds and re-render

### Key Socket Events

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `ticket:created` | Server → Clients | Ticket data, position, estimated wait | Customer checks in at kiosk |
| `ticket:called` | Server → Clients | Ticket data, counter number | Teller calls next |
| `ticket:completed` | Server → Clients | Ticket ID, service time | Teller completes service |
| `ticket:no_show` | Server → Clients | Ticket ID | Customer didn't show up |
| `ticket:transferred` | Server → Clients | Ticket data, new service | Ticket moved to different service |
| `ticket:prioritized` | Server → Clients | Ticket data, priority reason | Manager bumps to VIP |
| `queue:updated` | Server → Clients | Full queue snapshot | Any queue state change |
| `counter:updated` | Server → Clients | Counter status change | Counter opened/closed/break |
| `queue:paused` | Server → Clients | Branch ID, paused by | Manager pauses queue |
| `queue:resumed` | Server → Clients | Branch ID | Manager resumes queue |
| `queue:auto_opened` | Server → Clients | Branch ID | Scheduled auto-open at opening time |
| `queue:auto_closed` | Server → Clients | Branch ID | Scheduled auto-close at closing time |
| `announcement:created` | Server → Clients | Announcement data | Manager broadcasts message |

---

## The Six User Interfaces

### 1. Kiosk Interface (Public — No Auth)

**URL:** `/kiosk/:branchId`
**Purpose:** Touch-screen terminal in the bank lobby where customers take a ticket
**Optimized for:** Large touch displays (portrait orientation), zero training

**Screen 1 — Service Selection:**
The full-height screen shows the bank logo and branch name in a slim header bar, with a language toggle (French/Arabic) and current time. The main area displays a centered heading "Sélectionnez votre service" above a responsive grid of large, square service cards. Each card has a colored left-border accent matching the service color, a large Material Symbol icon (40-64px), and the service name in bold. Cards have hover/touch effects (shadow + scale animation). Below the grid, a subtle instruction reads "Touchez pour sélectionner."

If the branch manager has paused the queue, a full-screen translucent overlay appears with a large amber pause icon (80px), "Service temporairement indisponible" heading, and a pulsing "En attente de reprise..." message. Customers cannot take tickets while paused.

**Screen 2 — Phone Number & Ticket Confirmation:**
After selecting a service, the customer sees a centered white card showing the chosen service (colored badge with icon + name). Below it, a phone number input with the "+216" Tunisia country code prefix and a formatted input field (XX XXX XXX). Two action buttons: "Obtenir un ticket" (primary, SG Red) and "Ignorer le téléphone" (secondary, outlined gray).

Once the ticket is created, the screen transforms to show the ticket number in large display text (48-80px, light weight 300, service-colored), the service name, a two-column grid showing queue position ("#5") and estimated wait ("~15 minutes"), a QR code for mobile tracking with a "Copier le lien" button, and a "Nouveau ticket" button. The screen auto-redirects back to service selection after 15 seconds.

---

### 2. TV Queue Display (Public — No Auth)

**URL:** `/display/:branchId`
**Purpose:** Large TV screen in the waiting area showing who's being served and who's next
**Optimized for:** 16:9 landscape displays, readable from 5+ meters away

**Layout:** The screen divides into three horizontal bands:

**Header (~5%):** Bank logo + branch name on the left, current time (HH:mm, weight 300) on the right, separated by a thin bottom border.

**Hero Section (~60%):** Light gray background (`#F5F5F5`) containing up to 4 large "hero cards" — one per active counter currently serving a customer. Each hero card is a tall white rectangle with generous rounded corners (28px) and soft shadows. Inside: "GUICHET" label in small uppercase, the counter number in enormous text (80px, weight 300), the ticket number below (48px, service-colored, weight 300), and a colored service tag at the bottom (e.g., a rose pill reading "RETRAIT" with a `local_atm` icon). A 4px bottom border in the service color anchors the card. When a ticket is freshly called, a pulsing red "NEW" badge appears in the top-right corner. If no counters are active, a centered empty state shows an hourglass icon with "En attente d'appels."

**Queue Section (~35%):** White background with a top border. Header shows "PROCHAINS EN FILE" with a schedule icon, plus stats: "X clients en attente" and "Prochain appel: ~5 min." Below, a horizontal scroll of smaller queue cards (max 8 visible). Each card has a 4px top accent border in the service color, a position label ("Position 1"), the ticket number (22px, bold, service-colored), the service name in small gray text, and estimated wait time. VIP tickets get a gold/amber gradient border and special badge. If more than 8 customers wait, a dashed-border "+X" card appears at the end.

**Closed/Paused Overlay:** When the branch is closed or queue paused, a full-screen dark overlay (95% black opacity) covers everything. Centered: a 120px icon (red door for closed, amber pause for paused), the status title in 64px light text, a subtitle message in 24px at 70% opacity, and the time tucked in the bottom-right corner.

**Announcements:** When a manager sends an announcement, a vertical strip slides in from the right side of the hero section, displaying the message with a dismiss option. It pushes the hero cards left to make room.

---

### 3. Teller Dashboard (Authenticated — Role: Teller)

**URL:** `/teller`
**Purpose:** The teller's workstation — call customers, serve them, mark complete or no-show
**Optimized for:** Desktop monitors and tablets, minimal clicks for maximum throughput

**Layout:** Full-screen with a horizontal header, a two-panel main area, and a footer queue strip.

**Header:** Bank logo + "Guichet X" (counter number, bold) on the left. On the right: current time (hidden on mobile), language toggle, and a user menu button showing the teller's name with a logout dropdown.

**Left Panel (2/3 width — "En service"):**
When serving a customer: A large centered card displays the ticket number in ultra-light text (80px, weight 300, black), a thin decorative horizontal line with the service name centered on it, and a running timer (MM:SS format, weight 300, light gray). Below: two action buttons side by side — "Compléter" (solid black, `check_circle` icon) and "Pas présenté" (outlined black, `cancel` icon).

When idle (no current ticket): A centered empty state with an hourglass icon (48px, light gray) and "Aucun ticket en cours" message.

**Right Panel (1/3 width — "Prochain"):**
Light gray background (`#F8F8F8`). Shows the next ticket in queue with a preview card displaying the ticket number (smaller, lighter) and service name. A prominent "Appeler" button (SG Red, `campaign` icon) lets the teller call the next customer. This button is disabled while currently serving someone. If no tickets are waiting: a centered `groups` icon with "Aucun ticket en attente."

**Footer Bar:** A slim dark strip at the bottom shows "FILE D'ATTENTE" on the left, followed by a horizontal scroll of colored dot + ticket number pairs separated by chevron icons, representing the full queue. On the right: a `groups` icon with the total waiting count.

**Workflow:** The teller's cycle is: (1) Click "Appeler" to call next → ticket appears in left panel with timer starting → (2) Serve the customer → (3) Click "Compléter" when done (or "Pas présenté" if they didn't show) → (4) Right panel shows the new next ticket → repeat.

---

### 4. Branch Manager Dashboard (Authenticated — Role: Branch Manager)

**URL:** `/manager`
**Purpose:** Real-time operational command center for a single branch — monitor queues, manage tellers, track KPIs, and take corrective action
**Optimized for:** Desktop monitors (1280px+), with responsive tablet support

This is the most complex and feature-rich interface in the entire application. It provides the branch manager with complete situational awareness and operational control.

**Navigation:** A fixed horizontal top bar with the bank logo and branch name on the left, three navigation tabs in the center (Dashboard | Rapports | Paramètres), and language toggle + user dropdown on the right. Mobile shows a hamburger menu instead of tabs.

#### 4.1 Compact Metrics Bar

Immediately below the header, a white bar with a bottom border displays real-time KPIs as a horizontal row of compact metric cards:

- **Waiting Count**: A `groups` icon + large number + "EN ATTENTE" label. The background turns red when the count exceeds 10.
- **Avg Wait Time**: A `schedule` icon + number in minutes + "MIN ATTENTE"
- **SLA %**: A `verified` icon + percentage + "SLA" — shows what percentage of customers were served within the target threshold (e.g., 15 minutes).
- **Counters**: A `storefront` icon + "X/Y GUICHETS" — open counters out of total.

To the right of these metrics, a row of quick-action buttons:
- **VIP** — Opens a priority bump dialog to push a specific ticket to the front
- **Pauses** — Shows an indicator of how many tellers are currently on break
- **Counter Config** — Opens a modal to add/remove counters
- **Queue Toggle** — A single button that changes based on state: "Ouvrir" (green, when closed), "Pause" (amber, when open), or "Reprendre" (green, when paused)
- **Daily Objective** — Shows "X/100 OBJECTIF DU JOUR" progress inline

#### 4.2 Contextual Escalation Banner

This banner only appears when there are active issues requiring manager attention. It shows two types of escalations:

- **Long-waiting tickets** (>15 minutes): Each shows the ticket number, wait time in red, and a "Prioritize" button that bumps the ticket to VIP/front of queue.
- **Overtime breaks**: Each shows the teller name, break duration exceeding the planned time, and an "End Break" button.

The banner uses amber/red backgrounds depending on severity and disappears when all issues are resolved.

#### 4.3 Main Content Area (Two-Column Layout)

**Left Column — Live Queue List (Primary Focus):**

The heading "FILE D'ATTENTE" with a count badge (e.g., "(12)") sits above the queue list.

If the queue is paused, a banner appears: amber background, `pause_circle` icon, "File en pause (X min)" showing how long it's been paused. If closed: red background, `door_front` icon, "Agence fermée."

Below, the queue list displays every waiting and called ticket as a row:
- Colored left border matching the service color
- Ticket number in bold
- Service name
- Wait time (turns red when >15 minutes)
- Priority indicator (gold "VIP" badge if applicable)
- A "Prioritize" action button to bump any ticket to the front

Tickets are ordered by priority (VIP first), then by creation time (FIFO). The list updates in real-time — new tickets appear at the bottom, called tickets animate out, and positions recalculate instantly.

**Right Column — Sidebar (280px):**

**Counters Section:**
Heading "GUICHETS" with a settings/config gear button. Below, one card per counter showing:
- A colored left border: green (open and idle), green with ticket number (open and serving), amber (on break), gray (closed)
- A colored status dot
- Counter name (e.g., "G1") + assigned teller name
- Status text: "En attente" / "En service: A-042" / "Pause - Déjeuner (5 min)" / "Fermé"
- Action button: "Fermer" for open counters, "Ouvrir" for closed ones, "Fin pause" for those on break

**Quick Actions Section:**
Below a divider, action buttons for branch-wide operations:
- "Envoyer une annonce" (red outline, `campaign` icon) — opens the announcement modal to broadcast a message to TV displays
- "Fin de journée" — end-of-day closure button that requires a second click to confirm ("Confirmer fermeture?"), which auto-completes all serving tickets, cancels all waiting tickets, and closes all counters
- "Ouvrir tous" — open all counters at once
- "Reset" — nuclear option that clears the entire queue (requires double-confirmation)

#### 4.4 Collapsible Performance Sections

Below the main queue area, expandable/collapsible sections provide deeper analytics:

**Team Performance & Stats:**
When collapsed, shows a one-line summary: top performer name + count, daily objective progress, and active agent count. When expanded, reveals three cards:

- **Team Performance Card**: Shows overall team stats (average service time, average rest time) and a ranked list of each teller with tickets served, average service time, and a slow-teller warning badge if their service time exceeds 2x the average.
- **Branch Objectives Card**: Daily target progress bar (e.g., "67/100 served"), average wait time target with current value, SLA target with current percentage, and a top-services breakdown showing the 3 busiest services.
- **Team Champion Card**: Highlights the top-performing teller of the day with their stats, plus a runner-up.

**Historical Trends:**
When collapsed, shows "Tendances - Historique." When expanded, displays Recharts line/bar charts showing week and month trends for: customers served per day, average wait time, SLA percentage, and no-show rate.

#### 4.5 Branch Manager Modals

The dashboard provides several modal dialogs triggered from the sidebar and action buttons:

- **CounterConfigModal**: Adjust the number of counters — a number input shows current count, and changing it auto-creates or removes counters.
- **AnnouncementModal**: Compose a broadcast message with French text, optional Arabic translation, priority level (normal/urgent), TTS toggle, and display duration in seconds.
- **TargetEditModal**: Set daily goals — served target (customers/day), average wait target (minutes), SLA target (percentage), and SLA threshold (minutes within which service counts as "met").
- **TellerTimelineModal**: Deep-dive into a specific teller's day — shows a chronological timeline of service sessions (with customer counts), break periods (with durations), and total hours worked.
- **BreakModal**: Start a break for a teller — select the counter, choose a reason (lunch/prayer/personal/urgent), set duration, and start.

---

### 5. HQ Admin Dashboard (Authenticated — Role: Bank Admin)

**URL:** `/admin`
**Purpose:** Bank-wide oversight across all branches — monitor health, manage configuration
**Optimized for:** Desktop, data-dense tables and forms

**KPI Section:** Four large metric cards showing tenant-wide totals: total waiting customers, total served today, overall SLA compliance percentage, and total open counters across all branches.

**Needs Attention Section:** A smart alert panel that surfaces branches with issues — high queue backlog (>15 waiting), low SLA (<80%), or excessive teller breaks. Each issue has an action button for the admin.

**Branch Table:** A sortable, filterable table showing every branch with columns for: branch name + code, waiting customers, served today, SLA % (color-coded badge: green >90%, yellow 70-90%, red <70%), and open counters. Clicking a branch name opens its detail view.

**Sub-Pages:**
- **Admin Branches** (`/admin/branches`): CRUD interface for branches — create with name, code, address, region; configure operating hours and auto-scheduling; bulk import from CSV.
- **Admin Users** (`/admin/users`): User management with filters by role and branch. Create users with auto-generated passwords. Edit roles, branch assignments, and status (active/inactive).
- **Admin Services** (`/admin/services`): Service category management — create services with French/Arabic names, ticket prefix, icon, priority weight, average service time (manual or auto-calculated from last 24 hours of data).
- **Admin Templates** (`/admin/templates`): Bank-level service template library — create once, copy to multiple branches for consistent service offerings.

---

### 6. Customer Mobile Tracking (Public — No Auth)

**URL:** `/status/:ticketId`
**Purpose:** After scanning the QR code on their kiosk ticket, customers can track their position in real-time from their phone
**Optimized for:** Mobile phones, minimal data usage

Shows the ticket number, current position in queue, estimated wait time, service type, and branch name. Status updates in real-time via Socket.IO — the position count decreases as earlier customers are served, and the page shows "It's your turn! Go to Counter X" when called.

---

## Core Queue Logic

### Ticket Lifecycle

```
WAITING → CALLED → SERVING → COMPLETED
                           → NO_SHOW
                → CANCELLED
         → TRANSFERRED (re-enters as WAITING in new service queue)
```

### FIFO with Priority

The queue operates as a strict First-In-First-Out queue with a priority layer:
1. VIP tickets are always served before normal tickets, regardless of arrival time
2. Within the same priority level, tickets are served in creation order (FIFO)
3. A branch manager can bump any ticket to VIP via the "Prioritize" action

### Estimated Wait Calculation

```
estimatedWait = positionInQueue × avgServiceTime ÷ activeCountersForService
```

Where `avgServiceTime` can be manually configured per service or auto-calculated from the last 24 hours of completed tickets.

### Notification Triggers

| Event | SMS/WhatsApp Message |
|-------|---------------------|
| Ticket created | "Your ticket: A-042. Position: 5. Estimated wait: ~15 min" |
| Position reaches threshold | "Almost your turn! 2 customers ahead of you" |
| Ticket called | "It's your turn! Please go to Counter 3" |

### Auto-Scheduling

Branches can enable automatic queue management:
- At the configured opening time (e.g., 08:30), the system automatically opens the queue and all counters
- At closing time (e.g., 16:30), the system auto-completes any ticket being served, cancels all waiting/called tickets, closes all counters, and sets the queue to closed
- Weekends can be skipped via a `closedOnWeekends` flag
- All auto-actions are recorded in the audit trail with actor = "SYSTEM"

---

## API Structure

The REST API is organized into these route groups:

| Route Group | Base Path | Auth | Purpose |
|-------------|-----------|------|---------|
| Auth | `/api/auth` | Mixed | Login, refresh, logout, current user |
| Queue | `/api/queue` | Mixed | Ticket CRUD, queue state, branch/counter status |
| Admin | `/api/admin` | Yes (Admin+) | Tenant, branch, counter, service, user management |
| Analytics | `/api/analytics` | Yes | Real-time stats, historical trends, SLA, rankings |
| Breaks | `/api/breaks` | Yes | Start/end/extend teller breaks |
| Announcements | `/api/announcements` | Mixed | Create/dismiss branch announcements |
| Templates | `/api/templates` | Yes (Admin) | Service template library CRUD |
| Webhooks | `/api/webhooks` | No | Twilio/Meta delivery status callbacks |

All endpoints validate input with Zod schemas, enforce tenant isolation, and return consistent error responses with appropriate HTTP status codes.

---

## Internationalization

The app ships with two languages:

- **French (fr)** — Default language, LTR layout
- **Arabic (ar)** — Full RTL support with mirrored layouts

The language preference is stored in `localStorage` and persists across sessions. Switching languages instantly updates:
- All UI text (buttons, labels, headings, error messages)
- Document direction (`ltr` ↔ `rtl`)
- Font family (Inter ↔ Noto Sans Arabic)
- Layout mirroring (padding, margins, borders, flex directions)

Translation coverage spans every user-facing string: authentication screens, kiosk flow, teller dashboard, manager dashboard, admin panels, error messages, service names, role labels, and notification templates.

---

## State Management

The frontend uses two Zustand stores:

### Auth Store (`authStore`)
Manages authentication state: current user, access/refresh tokens, login/logout actions, and token refresh logic with a queuing mechanism to prevent race conditions when multiple API calls trigger simultaneous refreshes.

### Queue Store (`queueStore`)
Manages real-time queue state: current branch data, ticket list, counter statuses, socket connection lifecycle, and event handlers for all Socket.IO events. This store subscribes to socket events on mount and updates the UI reactively — components consuming this store automatically re-render when queue data changes.

---

## Security Model

1. **Authentication**: JWT with short-lived access tokens (15min) and database-backed refresh tokens (7 days) enabling instant revocation
2. **Authorization**: Four-tier RBAC with branch isolation — tellers and managers can only access their own branch's data
3. **Tenant isolation**: Every database query is scoped by `tenantId` — no cross-tenant data access is possible
4. **Input validation**: All API inputs validated with Zod schemas before processing
5. **Password security**: bcrypt hashing with default cost factor 10
6. **HTTP security**: Helmet middleware for security headers, CORS with origin validation
7. **Webhook verification**: HMAC-SHA256 signature verification for Meta/Twilio callbacks
8. **Rate limiting**: Configured limits for login (5/min), checkin (10/min), and general API (100/min)
9. **Audit trail**: Every ticket state change creates an immutable TicketHistory record with actor, action, timestamp, and metadata
