#!/usr/bin/env tsx
/**
 * BléSaf Banking — Full-Day Simulation Script
 *
 * Simulates a complete banking day (08:00–16:00) at Agence Lac 2,
 * compressed into ~15 real minutes. Calls real API endpoints so all
 * dashboards (BM, HQ, TV display, kiosk) update live.
 *
 * Usage:
 *   cd apps/api && npx tsx scripts/simulate-day.ts [options]
 *
 * Options:
 *   --duration <min>   Real-time duration in minutes (default: 15)
 *   --speed <mult>     Speed multiplier, overrides --duration (e.g. 32)
 *   --no-reset         Skip queue reset at startup
 *   --quiet            Only show summaries, not individual events
 */

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';
const BRANCH_CODE = 'LAC2';
const PASSWORD = 'demo123';

const MANAGER_CRED = { email: 'manager@demo-bank.tn', name: 'Fatma Trabelsi' };
const TELLER_CREDS = [
  { email: 'teller1@demo-bank.tn', name: 'Mohamed' },
  { email: 'teller2@demo-bank.tn', name: 'Leila' },
  { email: 'teller3@demo-bank.tn', name: 'Ali' },
];

/** Customers per simulated hour */
const HOURLY_RATES: Record<number, number> = {
  8: 9, 9: 15, 10: 20, 11: 27, 12: 5, 13: 15, 14: 20, 15: 8,
};

/** Service distribution weights (must sum to 100) */
const SERVICE_WEIGHTS = [
  { prefix: 'A', weight: 40 },  // Retrait / Dépôt
  { prefix: 'B', weight: 25 },  // Virements
  { prefix: 'C', weight: 20 },  // Cartes & Documents
  { prefix: 'D', weight: 15 },  // Autres services
];

/** Service time ranges in simulated minutes [min, max] */
const SERVICE_TIMES: Record<string, [number, number]> = {
  A: [3, 8],    // Retrait / Dépôt — quick cash ops
  B: [5, 15],   // Virements — medium, requires verification
  C: [5, 15],   // Cartes & Documents — varies by task
  D: [5, 20],   // Autres services — wide range
};

/** Scheduled breaks (simulated times) */
const BREAK_SCHEDULE = [
  { simTime: '12:00', tellerIdx: 0, reason: 'lunch' as const, durationMins: 30 },
  { simTime: '12:20', tellerIdx: 1, reason: 'lunch' as const, durationMins: 30 },
  { simTime: '12:40', tellerIdx: 2, reason: 'lunch' as const, durationMins: 30 },
  { simTime: '13:30', tellerIdx: 2, reason: 'prayer' as const, durationMins: 15 },
];

const NO_SHOW_RATE = 0.05;
const VIP_TOTAL = 3;

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  // Minimum 50ms to prevent tight loops that could starve the event loop
  return new Promise(resolve => setTimeout(resolve, Math.max(50, ms)));
}

function randomBetween(min: number, max: number): number {
  // Bell-curve: average of 2 uniform randoms
  const r = (Math.random() + Math.random()) / 2;
  return min + r * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function generatePhone(): string {
  // Tunisian numbers must start with 2, 4, 5, or 9 after +216
  const validPrefixes = [2, 4, 5, 9];
  const prefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
  const rest = String(randomInt(1000000, 9999999));
  return `+216${prefix}${rest}`;
}

// ─────────────────────────────────────────────────────────────────
// SimClock — Time Compression Engine
// ─────────────────────────────────────────────────────────────────

class SimClock {
  readonly speedMultiplier: number;
  private startReal = 0;
  private readonly simStartMins = 8 * 60;  // 08:00
  private readonly simEndMins = 16 * 60;    // 16:00

  constructor(realDurationMins: number) {
    const simDuration = this.simEndMins - this.simStartMins; // 480
    this.speedMultiplier = simDuration / realDurationMins;
  }

  start(): void {
    this.startReal = Date.now();
  }

  /** Convert N simulated minutes to real milliseconds */
  toRealMs(simMins: number): number {
    return (simMins * 60_000) / this.speedMultiplier;
  }

  /** Current simulated time in minutes since midnight */
  private simMinutes(): number {
    const elapsed = Date.now() - this.startReal;
    const simElapsed = (elapsed / 60_000) * this.speedMultiplier;
    return this.simStartMins + simElapsed;
  }

  /** Current simulated time as "HH:MM" */
  getSimTime(): string {
    const total = Math.min(this.simMinutes(), this.simEndMins);
    const h = Math.floor(total / 60);
    const m = Math.floor(total % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** Current simulated hour (8-16) */
  getSimHour(): number {
    return Math.floor(this.simMinutes() / 60);
  }

  /** Is simulated day over? */
  isDayOver(): boolean {
    return this.simMinutes() >= this.simEndMins;
  }

  /** Should we stop admitting new customers? (15:45) */
  isStopAdmissions(): boolean {
    return this.simMinutes() >= 15 * 60 + 45;
  }

  /** Real milliseconds until a given simulated time "HH:MM" */
  msUntil(simTimeStr: string): number {
    const [h, m] = simTimeStr.split(':').map(Number);
    const targetMins = h * 60 + m;
    const delta = targetMins - this.simMinutes();
    return delta > 0 ? this.toRealMs(delta) : 0;
  }
}

// ─────────────────────────────────────────────────────────────────
// ApiClient — HTTP Wrapper with Token Management
// ─────────────────────────────────────────────────────────────────

interface AuthData {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

class ApiClient {
  private tokens = new Map<string, AuthData>();
  private tokenTimestamps = new Map<string, number>();

  async login(email: string, password: string): Promise<AuthData> {
    const resp = await this.post('/auth/login', { email, password });
    const data = resp.data;
    const auth: AuthData = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userId: data.user.id ?? data.user.userId,
    };
    this.tokens.set(email, auth);
    this.tokenTimestamps.set(email, Date.now());
    return auth;
  }

  /** Proactively refresh a token if it's older than 12 minutes */
  async ensureFreshToken(email: string): Promise<string> {
    const ts = this.tokenTimestamps.get(email) ?? 0;
    const age = Date.now() - ts;
    if (age > 12 * 60_000) { // Refresh after 12 min (tokens expire at 15)
      try {
        const newToken = await this.refresh(email);
        return newToken;
      } catch {
        // If refresh fails, try re-login
        try {
          const auth = await this.login(email, PASSWORD);
          return auth.accessToken;
        } catch {
          // Return existing token, hope for the best
        }
      }
    }
    return this.tokens.get(email)?.accessToken ?? '';
  }

  /** Get the current token for an email (without refreshing) */
  getToken(email: string): string {
    return this.tokens.get(email)?.accessToken ?? '';
  }

  private async refresh(email: string): Promise<string> {
    const stored = this.tokens.get(email);
    if (!stored) throw new Error(`No stored token for ${email}`);
    const resp = await this.rawFetch('POST', '/auth/refresh', {
      refreshToken: stored.refreshToken,
    });
    stored.accessToken = resp.data.accessToken;
    stored.refreshToken = resp.data.refreshToken;
    this.tokenTimestamps.set(email, Date.now());
    return stored.accessToken;
  }

  async get(path: string, token?: string): Promise<any> {
    return this.rawFetch('GET', path, undefined, token);
  }

  async post(path: string, body: any, token?: string): Promise<any> {
    return this.rawFetch('POST', path, body, token);
  }

  async patch(path: string, body: any, token?: string): Promise<any> {
    return this.rawFetch('PATCH', path, body, token);
  }

  private async rawFetch(
    method: string,
    path: string,
    body?: any,
    token?: string,
    retry = true,
  ): Promise<any> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Use manual AbortController for reliable timeout (vs AbortSignal.timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      throw fetchErr;
    }

    clearTimeout(timeoutId);

    if (resp.status === 401 && retry && token) {
      for (const [email, auth] of this.tokens) {
        if (auth.accessToken === token) {
          const newToken = await this.refresh(email);
          return this.rawFetch(method, path, body, newToken, false);
        }
      }
    }

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const err = new Error(`API ${method} ${path}: ${resp.status} ${json.error || resp.statusText}`);
      (err as any).status = resp.status;
      (err as any).body = json;
      throw err;
    }

    return json;
  }
}

// ─────────────────────────────────────────────────────────────────
// Logger — Formatted Console Output
// ─────────────────────────────────────────────────────────────────

let quietMode = false;

function log(simTime: string, msg: string): void {
  if (quietMode) return;
  console.log(`  [${simTime}]  ${msg}`);
}

function logImportant(simTime: string, msg: string): void {
  // Always shown, even in quiet mode
  console.log(`  [${simTime}]  ${msg}`);
}

function header(text: string): void {
  console.log('');
  console.log('  ' + '\u2550'.repeat(60));
  console.log(`  ${text}`);
  console.log('  ' + '\u2550'.repeat(60));
}

function divider(): void {
  console.log('  ' + '\u2500'.repeat(60));
}

// ─────────────────────────────────────────────────────────────────
// SimState — Shared Simulation State
// ─────────────────────────────────────────────────────────────────

interface ServiceInfo {
  id: string;
  prefix: string;
  nameFr: string;
  avgTime: number;
}

interface CounterInfo {
  id: string;
  number: number;
  tellerName: string;
  tellerToken: string;
  tellerEmail: string;
  tellerId: string;
}

interface HourlyStats {
  created: number;
  served: number;
  noShows: number;
}

class SimState {
  branchId = '';
  services = new Map<string, ServiceInfo>();
  counters: CounterInfo[] = [];
  managerToken = '';
  managerId = '';

  // Tracking
  customerCount = 0;
  vipCount = 0;
  totalServed = 0;
  totalNoShows = 0;
  serviceBreakdown = new Map<string, number>();
  hourlyStats = new Map<number, HourlyStats>();

  getHourStats(hour: number): HourlyStats {
    if (!this.hourlyStats.has(hour)) {
      this.hourlyStats.set(hour, { created: 0, served: 0, noShows: 0 });
    }
    return this.hourlyStats.get(hour)!;
  }
}

// ─────────────────────────────────────────────────────────────────
// CustomerGenerator — Simulated Customer Arrivals
// ─────────────────────────────────────────────────────────────────

class CustomerGenerator {
  private running = false;
  private vipTimesUsed = 0;
  // Pre-determined VIP arrival hours (scattered in busy periods)
  private vipHours = [9, 11, 14].slice(0, VIP_TOTAL);

  constructor(
    private clock: SimClock,
    private api: ApiClient,
    private state: SimState,
  ) {}

  async run(): Promise<void> {
    this.running = true;

    while (this.running && !this.clock.isStopAdmissions()) {
      const hour = this.clock.getSimHour();
      const rate = HOURLY_RATES[hour] ?? 0;

      if (rate === 0) {
        await sleep(this.clock.toRealMs(5));
        continue;
      }

      // Average interval between customers in sim-minutes
      const baseInterval = 60 / rate;
      // Poisson-like jitter: 0.3x to 1.7x
      const jitter = 0.3 + Math.random() * 1.4;
      const waitMins = baseInterval * jitter;

      await sleep(this.clock.toRealMs(waitMins));
      if (!this.running || this.clock.isStopAdmissions()) break;

      try {
        await this.createCustomer();
      } catch (err: any) {
        logImportant(this.clock.getSimTime(), `Customer creation failed: ${err.message}`);
      }
    }
  }

  stop(): void {
    this.running = false;
  }

  private async createCustomer(): Promise<void> {
    const simTime = this.clock.getSimTime();
    const hour = this.clock.getSimHour();

    // Pick service
    const svcWeight = pickWeighted(SERVICE_WEIGHTS);
    const service = this.state.services.get(svcWeight.prefix);
    if (!service) return;

    // VIP decision
    const isVip = this.vipTimesUsed < VIP_TOTAL && this.vipHours.includes(hour) && Math.random() < 0.15;
    if (isVip) this.vipTimesUsed++;

    // Phone (70% provide one)
    const phone = Math.random() < 0.7 ? generatePhone() : undefined;

    this.state.customerCount++;
    const num = this.state.customerCount;

    const resp = await this.api.post('/queue/checkin', {
      branchId: this.state.branchId,
      serviceCategoryId: service.id,
      customerPhone: phone,
      notificationChannel: 'none',
      priority: isVip ? 'vip' : 'normal',
      checkinMethod: Math.random() > 0.3 ? 'kiosk' : 'mobile',
    });

    const ticket = resp.data.ticket ?? resp.data;
    const ticketNum = ticket.ticketNumber;

    // Track service breakdown
    const prev = this.state.serviceBreakdown.get(svcWeight.prefix) || 0;
    this.state.serviceBreakdown.set(svcWeight.prefix, prev + 1);

    // Track hourly
    this.state.getHourStats(hour).created++;

    // Track VIP
    if (isVip) this.state.vipCount++;

    const vipTag = isVip ? ' [VIP]' : '';
    log(simTime, `Customer #${num} \u2192 ${ticketNum} (${service.nameFr})${vipTag} | pos: ${resp.data.position}, ~${resp.data.estimatedWaitMins}min`);
  }
}

// ─────────────────────────────────────────────────────────────────
// TellerAgent — Autonomous Teller Simulation
// ─────────────────────────────────────────────────────────────────

class TellerAgent {
  isBusy = false;
  isOnBreak = false;
  private running = false;
  private stats = { served: 0, noShows: 0, totalServiceMins: 0 };
  currentTicketId: string | null = null;

  constructor(
    private clock: SimClock,
    private api: ApiClient,
    private state: SimState,
    public name: string,
    public counterId: string,
    public counterNumber: number,
    private token: string,
    private email: string,
  ) {}

  async run(): Promise<void> {
    this.running = true;
    let tokenRefreshCounter = 0;
    log(this.clock.getSimTime(), `Teller ${this.name} ready at Counter ${this.counterNumber}`);

    // Stagger start: each teller waits a bit so they don't all call API simultaneously
    await sleep(this.counterNumber * 800);

    while (this.running && !this.clock.isDayOver()) {
      // On break — wait and check periodically
      if (this.isOnBreak) {
        await sleep(this.clock.toRealMs(0.5));
        continue;
      }

      // Proactive token refresh every ~20 iterations (before 15min expiry)
      tokenRefreshCounter++;
      if (tokenRefreshCounter % 20 === 0) {
        this.token = await this.api.ensureFreshToken(this.email);
      }

      // Try to call next
      let result: any;
      try {
        result = await this.api.post('/queue/call-next', { counterId: this.counterId }, this.token);
      } catch (err: any) {
        if (err.status === 400) {
          const errMsg = String(err.body?.error || err.message || '').toLowerCase();
          // Counter has an active ticket stuck — try to complete it
          if (errMsg.includes('active') || errMsg.includes('serving') || errMsg.includes('current')) {
            logImportant(this.clock.getSimTime(), `${this.name}: counter has stuck ticket, attempting recovery...`);
            await this.recoverStuckTicket();
            await sleep(this.clock.toRealMs(0.5));
            continue;
          }
          // No tickets waiting — back off
          await sleep(this.clock.toRealMs(1 + Math.random()));
          continue;
        }
        if (err.status === 404) {
          await sleep(this.clock.toRealMs(1 + Math.random()));
          continue;
        }
        // Token expired — refresh
        if (err.status === 401) {
          try {
            this.token = await this.api.ensureFreshToken(this.email);
          } catch {
            // ignore, retry next cycle
          }
          await sleep(this.clock.toRealMs(0.5));
          continue;
        }
        logImportant(this.clock.getSimTime(), `Teller ${this.name}: call-next error: ${err.message}`);
        await sleep(this.clock.toRealMs(1));
        continue;
      }

      const ticket = result.data?.ticket;
      if (!ticket) {
        // No ticket available
        await sleep(this.clock.toRealMs(1 + Math.random()));
        continue;
      }

      this.isBusy = true;
      this.currentTicketId = ticket.id;
      const ticketNum = ticket.ticketNumber;
      const servicePrefix = ticket.servicePrefix || ticketNum?.charAt(0) || 'A';

      log(this.clock.getSimTime(), `${this.name} called ${ticketNum} at Counter ${this.counterNumber}`);

      // Determine if no-show
      if (Math.random() < NO_SHOW_RATE) {
        // Customer doesn't show up — wait 1-2 sim minutes then mark
        await sleep(this.clock.toRealMs(1 + Math.random()));
        try {
          await this.api.post(`/queue/${ticket.id}/no-show`, {}, this.token);
          log(this.clock.getSimTime(), `${this.name}: NO-SHOW ${ticketNum}`);
          this.stats.noShows++;
          this.state.totalNoShows++;
          this.state.getHourStats(this.clock.getSimHour()).noShows++;
        } catch (err: any) {
          logImportant(this.clock.getSimTime(), `${this.name}: no-show error for ${ticketNum}: ${err.message}`);
        }
      } else {
        // Serve the customer
        const range = SERVICE_TIMES[servicePrefix] ?? [5, 15];
        const serviceMins = Math.round(randomBetween(range[0], range[1]));

        await sleep(this.clock.toRealMs(serviceMins));

        try {
          await this.api.post(`/queue/${ticket.id}/complete`, {}, this.token);
          log(this.clock.getSimTime(), `${this.name} completed ${ticketNum} (${serviceMins} min)`);
          this.stats.served++;
          this.stats.totalServiceMins += serviceMins;
          this.state.totalServed++;
          this.state.getHourStats(this.clock.getSimHour()).served++;
        } catch (err: any) {
          logImportant(this.clock.getSimTime(), `${this.name}: complete error for ${ticketNum}: ${err.message}`);
        }
      }

      this.currentTicketId = null;
      this.isBusy = false;

      // Short idle between customers (30s - 2min simulated)
      if (!this.clock.isDayOver()) {
        const idleMins = 0.5 + Math.random() * 1.5;
        await sleep(this.clock.toRealMs(idleMins));
      }
    }
  }

  /** Recover from a counter with a stuck active ticket */
  private async recoverStuckTicket(): Promise<void> {
    if (this.currentTicketId) {
      // We know which ticket — try completing it
      try {
        await this.api.post(`/queue/${this.currentTicketId}/complete`, {
          notes: 'Auto-completed by simulation (stuck recovery)',
        }, this.token);
        logImportant(this.clock.getSimTime(), `${this.name}: recovered stuck ticket ${this.currentTicketId}`);
      } catch {
        // Try no-show instead
        try {
          await this.api.post(`/queue/${this.currentTicketId}/no-show`, {}, this.token);
          logImportant(this.clock.getSimTime(), `${this.name}: marked stuck ticket ${this.currentTicketId} as no-show`);
        } catch {
          // ignore — will retry next loop
        }
      }
      this.currentTicketId = null;
      this.isBusy = false;
      return;
    }

    // Don't know which ticket — get teller queue view to find it
    try {
      const view = await this.api.get(
        `/queue/branch/${this.state.branchId}/teller`,
        this.token,
      );
      const serving = view.data?.currentTicket || view.data?.servingTicket;
      if (serving?.id) {
        await this.api.post(`/queue/${serving.id}/complete`, {
          notes: 'Auto-completed by simulation (stuck recovery)',
        }, this.token);
        logImportant(this.clock.getSimTime(), `${this.name}: recovered stuck ticket ${serving.ticketNumber || serving.id}`);
      }
    } catch {
      // Last resort — just wait and hope it clears
    }
    this.isBusy = false;
  }

  stop(): void {
    this.running = false;
  }

  getStats() {
    return { ...this.stats };
  }
}

// ─────────────────────────────────────────────────────────────────
// BreakScheduler — Staggered Lunch + Prayer Breaks
// ─────────────────────────────────────────────────────────────────

class BreakScheduler {
  private running = false;
  private activeBreaks = new Map<number, { breakId: string; endSimTime: number }>();

  constructor(
    private clock: SimClock,
    private api: ApiClient,
    private state: SimState,
    private tellers: TellerAgent[],
  ) {}

  /**
   * Run as a polling loop instead of setTimeout-based scheduling.
   * This prevents all breaks from firing simultaneously if the event loop freezes.
   */
  async run(): Promise<void> {
    this.running = true;
    const pending = [...BREAK_SCHEDULE];
    const started = new Set<number>();

    while (this.running && !this.clock.isDayOver()) {
      const simTime = this.clock.getSimTime();
      const [curH, curM] = simTime.split(':').map(Number);
      const curMins = curH * 60 + curM;

      // Check if any pending breaks should start (one at a time, sequentially)
      for (let i = 0; i < pending.length; i++) {
        if (started.has(i)) continue;
        const brk = pending[i];
        const [h, m] = brk.simTime.split(':').map(Number);
        const brkMins = h * 60 + m;

        if (curMins >= brkMins) {
          started.add(i);
          await this.startBreak(brk);
          // Small delay between break operations to prevent deadlocks
          await sleep(500);
        }
      }

      // Check if any active breaks should end
      for (const [tellerIdx, brk] of this.activeBreaks) {
        if (curMins >= brk.endSimTime) {
          await this.endBreak(tellerIdx, brk.breakId);
          this.activeBreaks.delete(tellerIdx);
          await sleep(500);
        }
      }

      // Poll every 2 sim minutes
      await sleep(this.clock.toRealMs(2));
    }
  }

  cancel(): void {
    this.running = false;
  }

  private async startBreak(config: typeof BREAK_SCHEDULE[number]): Promise<void> {
    const teller = this.tellers[config.tellerIdx];
    if (!teller) return;

    // Refresh manager token before break operations
    this.state.managerToken = await this.api.ensureFreshToken(MANAGER_CRED.email);

    // Wait for teller to finish current service (max 60 polls)
    let waitCount = 0;
    while (teller.isBusy && waitCount < 60) {
      await sleep(this.clock.toRealMs(0.5));
      waitCount++;
    }

    teller.isOnBreak = true;
    logImportant(
      this.clock.getSimTime(),
      `BREAK: ${teller.name} \u2192 ${config.reason} (${config.durationMins} min) at Counter ${teller.counterNumber}`,
    );

    try {
      // End any existing break on this counter first
      try {
        const existingBreak = await this.api.get(`/breaks/counter/${teller.counterId}`, this.state.managerToken);
        const existingId = existingBreak.data?.breakId || existingBreak.data?.id;
        if (existingId) {
          await this.api.post(`/breaks/${existingId}/end`, {}, this.state.managerToken);
          logImportant(this.clock.getSimTime(), `  Ended stale break on Counter ${teller.counterNumber}`);
          await sleep(300); // Small delay after ending break before starting new one
        }
      } catch {
        // No existing break — fine
      }

      const resp = await this.api.post('/breaks/start', {
        counterId: teller.counterId,
        reason: config.reason,
        durationMins: config.durationMins,
      }, this.state.managerToken);

      const breakId = resp.data?.id || resp.data?.breakId;

      // Track active break — end based on actual start time, not scheduled time
      const simTime = this.clock.getSimTime();
      const [h, m] = simTime.split(':').map(Number);
      const endSimTime = h * 60 + m + config.durationMins;
      this.activeBreaks.set(config.tellerIdx, { breakId, endSimTime });

    } catch (err: any) {
      logImportant(this.clock.getSimTime(), `Break start error for ${teller.name}: ${err.message}`);
      // Re-open the counter in case the failed break left it paused
      try {
        await this.api.patch(`/admin/counters/${teller.counterId}`, {
          status: 'open',
        }, this.state.managerToken);
      } catch {
        // ignore
      }
      teller.isOnBreak = false;
    }
  }

  private async endBreak(tellerIdx: number, breakId: string): Promise<void> {
    const teller = this.tellers[tellerIdx];
    if (!teller) return;

    // Refresh manager token before ending break
    this.state.managerToken = await this.api.ensureFreshToken(MANAGER_CRED.email);

    try {
      if (breakId) {
        await this.api.post(`/breaks/${breakId}/end`, {}, this.state.managerToken);
      }
    } catch (err: any) {
      logImportant(this.clock.getSimTime(), `Break end error for ${teller.name}: ${err.message}`);
    }

    teller.isOnBreak = false;
    logImportant(
      this.clock.getSimTime(),
      `BREAK END: ${teller.name} back at Counter ${teller.counterNumber}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Hourly Summary Scheduler
// ─────────────────────────────────────────────────────────────────

function scheduleHourlySummaries(clock: SimClock, state: SimState): NodeJS.Timeout[] {
  const timeouts: NodeJS.Timeout[] = [];

  for (let h = 9; h <= 16; h++) {
    const delay = clock.msUntil(`${String(h).padStart(2, '0')}:00`);
    if (delay > 0) {
      const prevHour = h - 1;
      const t = setTimeout(() => {
        const stats = state.getHourStats(prevHour);
        header(`HOURLY SUMMARY \u2014 ${String(prevHour).padStart(2, '0')}:00 to ${String(h).padStart(2, '0')}:00`);
        console.log(`    Created: ${stats.created}  |  Served: ${stats.served}  |  No-shows: ${stats.noShows}`);
        console.log(`    Running total: ${state.customerCount} created, ${state.totalServed} served`);
        console.log('');
      }, delay);
      timeouts.push(t);
    }
  }

  return timeouts;
}

// ─────────────────────────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────────────────────────

async function startup(api: ApiClient, state: SimState, skipReset: boolean): Promise<void> {
  header('INITIALIZATION');

  // 1. Find branch
  console.log('    Finding branch...');
  const branchResp = await api.get('/queue/branches');
  const branches = branchResp.data;
  const lac2 = branches.find((b: any) => b.code === BRANCH_CODE);
  if (!lac2) {
    throw new Error(`Branch "${BRANCH_CODE}" not found. Run: cd apps/api && npx tsx prisma/seed-demo.ts`);
  }
  state.branchId = lac2.id;
  console.log(`    Branch: ${lac2.name} (${lac2.id})`);

  // 2. Get services and counters
  console.log('    Loading services and counters...');
  const statusResp = await api.get(`/queue/branch/${state.branchId}/status`);
  const statusData = statusResp.data;

  for (const svc of statusData.services) {
    state.services.set(svc.prefix, {
      id: svc.id,
      prefix: svc.prefix,
      nameFr: svc.nameFr,
      avgTime: svc.avgServiceTime,
    });
  }
  console.log(`    Services: ${[...state.services.values()].map(s => `${s.prefix}:${s.nameFr}`).join(', ')}`);
  console.log(`    Counters: ${statusData.counters.length}`);

  // 3. Login manager
  console.log('    Logging in manager...');
  const managerAuth = await api.login(MANAGER_CRED.email, PASSWORD);
  state.managerToken = managerAuth.accessToken;
  state.managerId = managerAuth.userId;
  await sleep(500); // Rate limiter safety

  // 4. Login tellers
  const tellerAuths: AuthData[] = [];
  for (const cred of TELLER_CREDS) {
    console.log(`    Logging in ${cred.name}...`);
    const auth = await api.login(cred.email, PASSWORD);
    tellerAuths.push(auth);
    await sleep(500);
  }

  // 5. Disable autoQueueEnabled (prevents schedule service from auto-closing mid-simulation)
  console.log('    Disabling auto-queue scheduling...');
  try {
    await api.patch(`/admin/branches/${state.branchId}/operating-hours`, {
      autoQueueEnabled: false,
    }, state.managerToken);
  } catch (err: any) {
    console.log(`    Warning: Could not disable autoQueue: ${err.message}`);
  }

  // 6. Reset queue (unless --no-reset)
  if (!skipReset) {
    console.log('    Resetting queue...');
    try {
      await api.post(`/queue/branch/${state.branchId}/resume`, {}, state.managerToken);
    } catch {
      // Might already be open, ignore
    }
    await api.post(`/queue/branch/${state.branchId}/reset`, {}, state.managerToken);
  }

  // 7. Clear existing breaks on all counters
  console.log('    Clearing existing breaks...');
  const counters = statusData.counters.sort((a: any, b: any) => a.number - b.number);
  for (const counter of counters) {
    try {
      const breakResp = await api.get(`/breaks/counter/${counter.id}`, state.managerToken);
      const activeBreak = breakResp.data;
      // API returns breakId (not id)
      const breakId = activeBreak?.breakId || activeBreak?.id;
      if (breakId) {
        await api.post(`/breaks/${breakId}/end`, {}, state.managerToken);
        console.log(`    Ended existing break on Counter ${counter.number}`);
      }
    } catch {
      // No active break or error — fine
    }
  }

  // 8. Open all counters
  console.log('    Opening all counters...');
  await api.post('/admin/counters/batch/open', { branchId: state.branchId }, state.managerToken);

  // 9. Assign tellers to counters
  for (let i = 0; i < Math.min(counters.length, TELLER_CREDS.length); i++) {
    console.log(`    Assigning ${TELLER_CREDS[i].name} to Counter ${counters[i].number}...`);
    await api.patch(`/admin/counters/${counters[i].id}`, {
      assignedUserId: tellerAuths[i].userId,
      status: 'open',
    }, state.managerToken);

    state.counters.push({
      id: counters[i].id,
      number: counters[i].number,
      tellerName: TELLER_CREDS[i].name,
      tellerToken: tellerAuths[i].accessToken,
      tellerEmail: TELLER_CREDS[i].email,
      tellerId: tellerAuths[i].userId,
    });
  }

  console.log('    Initialization complete.');
}

// ─────────────────────────────────────────────────────────────────
// Shutdown & Summary
// ─────────────────────────────────────────────────────────────────

async function shutdown(
  api: ApiClient,
  clock: SimClock,
  state: SimState,
  customerGen: CustomerGenerator,
  tellers: TellerAgent[],
  breakSched: BreakScheduler,
  hourlyTimeouts: NodeJS.Timeout[],
): Promise<void> {
  logImportant(clock.getSimTime(), 'Closing time - finishing up...');

  // Stop generators
  customerGen.stop();
  breakSched.cancel();
  for (const t of hourlyTimeouts) clearTimeout(t);

  // Stop tellers
  for (const t of tellers) t.stop();

  // Wait for tellers to finish current service (max 90s real)
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline && tellers.some(t => t.isBusy)) {
    await sleep(2000);
  }

  // Refresh manager token before closing
  state.managerToken = await api.ensureFreshToken(MANAGER_CRED.email);

  // Close queue
  try {
    await api.post(`/queue/branch/${state.branchId}/close`, {}, state.managerToken);
  } catch (err: any) {
    logImportant('16:00', `Queue close error: ${err.message}`);
  }

  printSummary(state, tellers);
}

function printSummary(state: SimState, tellers: TellerAgent[]): void {
  header('END-OF-DAY SUMMARY \u2014 16:00');

  console.log(`    Total tickets created:   ${state.customerCount}`);
  console.log(`    Total served:            ${state.totalServed}`);
  console.log(`    No-shows:                ${state.totalNoShows}`);
  console.log(`    VIP tickets:             ${state.vipCount}`);
  console.log('');

  divider();
  console.log('    Service breakdown:');
  for (const [prefix, count] of [...state.serviceBreakdown.entries()].sort()) {
    const svc = state.services.get(prefix);
    const pct = state.customerCount > 0 ? Math.round((count / state.customerCount) * 100) : 0;
    console.log(`      ${prefix} (${svc?.nameFr || '?'}): ${count} tickets (${pct}%)`);
  }

  divider();
  console.log('    Teller performance:');
  for (const t of tellers) {
    const s = t.getStats();
    const avgSvc = s.served > 0 ? Math.round(s.totalServiceMins / s.served) : 0;
    console.log(`      ${t.name} (Counter ${t.counterNumber}): ${s.served} served, ${s.noShows} no-shows, avg ${avgSvc} min/customer`);
  }

  divider();
  console.log('    Hourly breakdown:');
  for (let h = 8; h < 16; h++) {
    const s = state.getHourStats(h);
    const bar = '\u2588'.repeat(Math.round(s.created / 2));
    console.log(`      ${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00  created: ${String(s.created).padStart(3)}  served: ${String(s.served).padStart(3)}  ${bar}`);
  }

  console.log('');
  console.log('  ' + '\u2550'.repeat(60));
  console.log('');
}

// ─────────────────────────────────────────────────────────────────
// CLI Arguments
// ─────────────────────────────────────────────────────────────────

function parseArgs(): { duration: number; skipReset: boolean; quiet: boolean } {
  const args = process.argv.slice(2);
  let duration = 15;
  let skipReset = false;
  let quiet = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration' && args[i + 1]) {
      duration = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--speed' && args[i + 1]) {
      const speed = parseInt(args[i + 1], 10);
      duration = Math.round(480 / speed);
      i++;
    } else if (args[i] === '--no-reset') {
      skipReset = true;
    } else if (args[i] === '--quiet') {
      quiet = true;
    }
  }

  return { duration, skipReset, quiet };
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

async function main() {
  const { duration, skipReset, quiet: q } = parseArgs();
  quietMode = q;

  const clock = new SimClock(duration);
  const api = new ApiClient();
  const state = new SimState();

  header('Bl\u00e9Saf Banking \u2014 Day Simulation: Agence Lac 2');
  console.log(`    Simulated: 08:00\u201316:00 (8 hours)`);
  console.log(`    Speed:     ${clock.speedMultiplier.toFixed(1)}x (~${duration} min real time)`);
  console.log(`    API:       ${API_BASE}`);
  console.log('');

  // Startup
  await startup(api, state, skipReset);

  // Create agents
  const tellers = state.counters.map(
    c => new TellerAgent(clock, api, state, c.tellerName, c.id, c.number, c.tellerToken, c.tellerEmail),
  );
  const customerGen = new CustomerGenerator(clock, api, state);
  const breakSched = new BreakScheduler(clock, api, state, tellers);

  // SIGINT handler
  let shuttingDown = false;
  process.on('SIGINT', async () => {
    if (shuttingDown) process.exit(1);
    shuttingDown = true;
    console.log('\n\n  Ctrl+C received \u2014 shutting down gracefully...\n');
    customerGen.stop();
    for (const t of tellers) t.stop();
    breakSched.cancel();
    printSummary(state, tellers);
    process.exit(0);
  });

  // Start the clock
  clock.start();

  header('SIMULATION STARTED \u2014 08:00');
  console.log('');

  // Schedule hourly summaries
  const hourlyTimeouts = scheduleHourlySummaries(clock, state);

  // Heartbeat: detect event loop freezes
  let lastHeartbeat = Date.now();
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const gap = now - lastHeartbeat;
    lastHeartbeat = now;
    if (gap > 15_000) { // More than 15s since last check (expected ~10s)
      logImportant(clock.getSimTime(), `WARNING: Event loop delayed by ${Math.round(gap / 1000)}s`);
    }
  }, 10_000);

  // Watchdog: log agent status every 60s real time (debug)
  const watchdogInterval = setInterval(() => {
    const tellerStatus = tellers.map(t =>
      `${t.name}:${t.isOnBreak ? 'break' : t.isBusy ? 'busy' : 'idle'}`
    ).join(' ');
    if (!quietMode) {
      logImportant(clock.getSimTime(), `[${tellerStatus}] customers:${state.customerCount} served:${state.totalServed}`);
    }
  }, 60_000);

  // Run everything concurrently (breaks now run as polling loop, not setTimeout)
  const results = await Promise.allSettled([
    customerGen.run(),
    ...tellers.map(t => t.run()),
    breakSched.run(),
  ]);

  clearInterval(heartbeatInterval);
  clearInterval(watchdogInterval);

  // Check for unexpected errors
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('  Agent error:', r.reason);
    }
  }

  // Shutdown
  await shutdown(api, clock, state, customerGen, tellers, breakSched, hourlyTimeouts);
}

main().catch(err => {
  console.error('\n  Simulation failed:', err.message || err);
  process.exit(1);
});
