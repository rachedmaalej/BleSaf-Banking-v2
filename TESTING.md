# BléSaf Banking - Testing Guide

## Servers

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:5173 | Vite dev server |
| Backend API | http://localhost:3001 | Express server |

---

## Test Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| **Super Admin** | `admin@blesaf.app` | `demo123` | Full system access |
| **Bank Admin** | `bank.admin@demo-bank.tn` | `demo123` | HQ-level access, no specific branch |
| **Branch Manager** | `manager@demo-bank.tn` | `demo123` | Agence Lac 2 |
| **Teller 1** | `teller1@demo-bank.tn` | `demo123` | Agence Lac 2 - Guichet 1 |
| **Teller 2** | `teller2@demo-bank.tn` | `demo123` | Agence Lac 2 - Guichet 2 |

---

## Application URLs

### Public Pages (No Auth Required)

| Page | URL | Description |
|------|-----|-------------|
| **Kiosk** | http://localhost:5173/kiosk/d01c25a4-6a51-495c-a13e-e343027400d2 | Touchscreen check-in for customers |
| **Mobile Check-in** | http://localhost:5173/join/d01c25a4-6a51-495c-a13e-e343027400d2 | Mobile-friendly check-in |
| **TV Display** | http://localhost:5173/display/d01c25a4-6a51-495c-a13e-e343027400d2 | Queue status for waiting area |
| **Ticket Status** | http://localhost:5173/status/{ticketId} | Customer ticket tracking |

### Protected Pages (Auth Required)

| Page | URL | Allowed Roles |
|------|-----|---------------|
| **Login** | http://localhost:5173/login | - |
| **Teller Dashboard** | http://localhost:5173/teller | teller, branch_manager |
| **Manager Dashboard** | http://localhost:5173/manager | branch_manager, bank_admin |
| **Admin Dashboard** | http://localhost:5173/admin | bank_admin, super_admin |
| **Admin - Users** | http://localhost:5173/admin/users | bank_admin, super_admin |
| **Admin - Branches** | http://localhost:5173/admin/branches | bank_admin, super_admin |
| **Admin - Services** | http://localhost:5173/admin/services | bank_admin, super_admin |

---

## Test Data

### Branch
- **Name:** Agence Lac 2
- **ID:** `d01c25a4-6a51-495c-a13e-e343027400d2`
- **Code:** LAC2
- **Address:** 15 Rue du Lac Turkana, Les Berges du Lac 2, Tunis

### Services

| Service | Prefix | Icon | Avg Time |
|---------|--------|------|----------|
| Retrait (Withdrawal) | A | 💵 | 5 min |
| Dépôt (Deposit) | B | 📥 | 7 min |
| Ouverture de compte | C | 📋 | 20 min |
| Prêts (Loans) | D | 🏦 | 30 min |
| Change (Exchange) | E | 💱 | 10 min |

### Counters

| Counter | Label | Status | Assigned To |
|---------|-------|--------|-------------|
| 1 | Guichet Rapide | Open | Mohamed Sassi (Teller 1) |
| 2 | - | Open | Leila Hamdi (Teller 2) |
| 3 | Comptes & Prêts | Closed | - |

---

## Testing Scenarios

### 1. Customer Flow (Kiosk)
1. Open http://localhost:5173/kiosk/d01c25a4-6a51-495c-a13e-e343027400d2
2. Select a service (e.g., "Retrait")
3. Optionally enter phone: `+216 20 123 456`
4. Click "Prendre un ticket"
5. Note the ticket number and QR code

### 2. Teller Flow
1. Login as `teller1@demo-bank.tn` / `demo123`
2. Open Teller Dashboard
3. Click "Appeler suivant" to call next ticket
4. Click "Commencer le service" when customer arrives
5. Click "Terminer" when done

### 3. Manager Flow
1. Login as `manager@demo-bank.tn` / `demo123`
2. View branch statistics
3. Monitor counter status
4. Check agent performance

### 4. Real-time Updates
1. Open TV Display in one browser
2. Open Kiosk in another browser
3. Create a ticket from kiosk
4. Watch it appear on TV Display
5. Login as teller and call the ticket
6. Watch status update on TV Display

---

## API Endpoints

### Public
```
GET  /api/queue/branch/:branchId/status   # Branch queue status + services
GET  /api/queue/ticket/:ticketId/status   # Ticket position
POST /api/queue/checkin                    # Create ticket
```

### Auth
```
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Queue (Auth Required)
```
POST /api/queue/call-next
POST /api/queue/:ticketId/serve
POST /api/queue/:ticketId/complete
POST /api/queue/:ticketId/no-show
POST /api/queue/:ticketId/transfer
```

---

## Phone Number Format

Tunisian phone numbers must:
- Start with +216
- Have 8 digits after country code
- First digit must be 2, 4, 5, or 9

**Valid examples:**
- `+216 20 123 456`
- `+216 98 765 432`
- `+216 55 555 555`

**Invalid:**
- `+216 11 111 111` (starts with 1)
- `+216 30 000 000` (starts with 3)

---

## Commands

```bash
# Start both servers
pnpm dev

# Start only API
pnpm dev:api

# Start only frontend
pnpm dev:web

# Reset database
pnpm db:push && pnpm db:seed

# Open Prisma Studio (DB viewer)
pnpm db:studio
```
