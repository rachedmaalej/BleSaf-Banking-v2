# Branch Manager Dashboard - Enhancement Plan

## User Profile: Bank Manager (BM)

**Context:**
- Manages **one branch** (single point of accountability)
- **Accountable for teller performance** (coaching, motivation)
- Reports to **Bank Admin (BA)** who oversees all branches
- Lives in a **competitive environment** with other branch managers

**Primary concerns:**
1. "Are there any problems RIGHT NOW?"
2. "Am I on track to hit my targets today?"
3. "Which tellers need coaching?"
4. "How does my branch compare to others?"

---

## Current Dashboard (Implemented)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ALERTS BANNER (conditional - only if issues exist)                  │
│   2 slow tellers - Queue > 10 customers - Counter G3 offline       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TODAY'S SCORECARD                                                   │
│   [Waiting] [Served] [Avg Wait] [Service Rate] [Rank]              │
│      5       47       ~8 min      12/hr        #2/5                │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐  ┌──────────────────────────────────────┐
│ COUNTERS                   │  │ TELLER LEADERBOARD                   │
│ G1 Ahmed   -> A-045        │  │  #1  Ahmed   32 served  ~6 min       │
│ G2 Sara    -> A-046        │  │  #2  Sara    28 served  ~7 min       │
│ G3 --      Closed          │  │  #3  Karim   15 served  ~18 min      │
└────────────────────────────┘  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ BRANCH RANKING (Today)                                              │
│  #1  Agence Lac 1     102 served   ~6 min wait                     │
│  #2  YOUR BRANCH       87 served   ~8 min wait                     │
│  #3  Agence Marsa      65 served   ~9 min wait                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase B: Core Operations (Next Priority)

### B.1 Quick Actions Panel

**Purpose:** Emergency controls always visible

```
┌─────────────────────────────────────────┐
│ Actions Rapides                         │
│ [Pause Queue] [Open All] [Announcement] │
└─────────────────────────────────────────┘
```

**Actions:**
- **Pause Queue:** Stops new ticket creation, shows "Temporarily unavailable" on kiosk
- **Open All Counters:** Bulk-opens all counters (emergency rush handling)
- **Send Announcement:** Display message on TV/kiosk

**API endpoints needed:**
```
POST /api/queue/branch/:branchId/pause
POST /api/queue/branch/:branchId/resume
POST /api/announcements
```

---

### B.2 Individual Long-Wait Alerts

**Purpose:** Proactive customer service for long waiters

**Alert trigger:** Any ticket waiting > 20 minutes

```
┌─────────────────────────────────────────┐
│ Long Wait Alert                         │
│ A-023 waiting 22 min (Service: Depot)   │
│ [Prioritize] [Call Now] [Dismiss]       │
└─────────────────────────────────────────┘
```

**Logic:**
```typescript
const LONG_WAIT_THRESHOLD = 20; // minutes

const longWaiters = tickets.filter(t =>
  t.status === 'waiting' &&
  (Date.now() - new Date(t.createdAt).getTime()) / 60000 > LONG_WAIT_THRESHOLD
);
```

---

### B.3 Priority Override (VIP/Urgent)

**Purpose:** Handle VIP customers, elderly, disabled, urgent cases

**Database changes:**
```prisma
model Ticket {
  // ... existing fields
  priority       TicketPriority @default(normal)
  priorityReason String?
  prioritizedBy  String?
  prioritizedAt  DateTime?
}

enum TicketPriority {
  normal
  priority    // general priority
  vip         // known VIP customer
  urgent      // emergency/urgent case
}
```

**UI - Queue preview ticket:**
```
┌────────────────────────┐
│ A-045  Depot           │
│ [Prioritize] [VIP]     │
└────────────────────────┘
```

**API endpoint:**
```
POST /api/queue/:ticketId/prioritize
Body: { priority: "vip", reason: "VIP customer" }
```

---

### B.4 Daily Targets & SLA Tracking

**Purpose:** Goal-setting and service quality tracking

**Database:**
```prisma
model BranchTarget {
  id           String   @id @default(uuid())
  branchId     String
  date         DateTime @db.Date
  servedTarget Int      @default(100)
  avgWaitTarget Int     @default(10)  // minutes
  slaTarget    Int      @default(90)  // percentage
  slaThreshold Int      @default(15)  // minutes for SLA
}
```

**UI - Enhanced scorecard:**
```
┌─────────────────────────────────────────┐
│ Objectif du jour: 87/100 (87%)          │
│ ████████████████████░░░░░░ On track!    │
│ Pace needed: 92 by now | You: 87 (-5)   │
│                                          │
│ SLA (served < 15 min): 87%  Target: 90% │
└─────────────────────────────────────────┘
```

**API endpoint:**
```
GET /api/analytics/branch/:branchId/sla
Returns: {
  totalServed: 87,
  withinSLA: 76,
  slaPercentage: 87.4,
  currentLongWaiters: [...]
}
```

---

## Phase C: Communication (Future)

### C.1 Announcement System

**Purpose:** Communicate with customers in lobby about delays, closures, promotions

```prisma
model Announcement {
  id         String   @id @default(uuid())
  branchId   String
  message    String
  type       String   // info, warning, urgent
  displayOn  String[] // tv, kiosk, sms
  startsAt   DateTime @default(now())
  expiresAt  DateTime
  createdBy  String
}
```

**Socket event:**
```typescript
socket.to(`branch:${branchId}`).emit('announcement:new', {
  message,
  type,
  expiresAt
});
```

---

### C.2 SMS Activation

**Purpose:** Customer notifications via Twilio

**Notification triggers:**
1. Ticket created → "You are #X, ~Y min wait"
2. Position 3 → "Almost your turn! Please approach"
3. Called → "It's your turn! Counter G2"
4. 5 min no-show → "You missed your turn, please check in again"

**BM controls:**
- Toggle SMS on/off per branch
- Set "notify at position" threshold
- View SMS sent today / remaining quota
- Bulk SMS for delays

---

## Phase D: Analytics (Future)

### D.1 Historical Trends

**Purpose:** Week/month patterns for staffing decisions

**API endpoint:**
```
GET /api/analytics/branch/:branchId/history
Query: { startDate, endDate, groupBy: 'day'|'week' }
```

### D.2 Peak Hour Heatmap

```
        Mon  Tue  Wed  Thu  Fri
8-9     ░░   ░░   ░░   ░░   ▓▓
9-10    ▒▒   ▒▒   ▒▒   ▒▒   ▓▓
10-11   ▓▓   ▓▓   ▓▓   ▓▓   ▓▓  <- Peak
11-12   ▓▓   ▓▓   ▓▓   ▓▓   ▓▓
12-13   ░░   ░░   ░░   ░░   ░░  <- Lunch dip
```

### D.3 Teller Activity Timeline

**Purpose:** Detailed view of teller's day for coaching

```
08:00 Connected to G1
08:05 A-001 served (4 min)
08:12 A-002 served (6 min)
10:30 Break (15 min)
10:45 Resumed
...
Summary: 32 served | 12 min idle | 1 break
```

---

## Implementation Priority

| Phase | Feature | Impact | Effort | Status |
|-------|---------|--------|--------|--------|
| A | Dashboard redesign | High | Medium | DONE |
| A | Alerts banner | High | Low | DONE |
| A | Teller leaderboard | Medium | Low | DONE |
| A | Branch ranking | Medium | Medium | DONE |
| B | Quick Actions Panel | Medium | Low | TODO |
| B | Long-wait alerts | High | Low | TODO |
| B | Priority override | High | Medium | TODO |
| B | Daily targets/SLA | Medium | Medium | TODO |
| C | Announcement system | Medium | Medium | Future |
| C | SMS activation | High | High | Future |
| D | Historical trends | Low | Medium | Future |
| D | Peak hour heatmap | Low | Medium | Future |

---

## Files to Modify (Phase B)

### Frontend
| File | Changes |
|------|---------|
| `apps/web/src/pages/manager/BranchDashboard.tsx` | Add Quick Actions, long-wait alerts |
| `apps/web/src/lib/api.ts` | Add prioritize, SLA endpoints |

### Backend
| File | Changes |
|------|---------|
| `apps/api/src/routes/queue.ts` | Add prioritize, pause/resume |
| `apps/api/src/routes/analytics.ts` | Add SLA endpoint |
| `apps/api/src/services/queueService.ts` | Priority logic |
| `apps/api/prisma/schema.prisma` | BranchTarget model, priority fields |

---

## Socket Events to Add

| Event | Payload | Purpose |
|-------|---------|---------|
| `queue:paused` | `{ branchId }` | Queue paused |
| `queue:resumed` | `{ branchId }` | Queue resumed |
| `ticket:prioritized` | `{ ticket, newPriority }` | Priority changed |
| `announcement:new` | `{ message, type, expiresAt }` | New announcement |
| `alert:long-wait` | `{ ticketId, waitMins }` | Long wait detected |

---

*Last updated: 2026-02-02*
