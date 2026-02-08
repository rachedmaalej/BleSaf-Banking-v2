# BM Dashboard v2 — Hybrid AI Prediction Engine

## Context

BléSaf already collects rich historical data (ticket-level timestamps, hourly snapshots, daily aggregates) but no intelligence layer exists to forecast future queue volume or provide proactive staffing recommendations. Branch managers currently react to queues after they build up.

This plan adds a **hybrid prediction system**: TensorFlow.js for fast numerical forecasts + Ollama LLM for natural-language staffing insights. Backend-first approach — build the prediction engine and API, then wire into a minimal v2 dashboard UI.

---

## Approach: Why Hybrid?

Four approaches were evaluated:

| Option | Approach | Verdict |
|--------|----------|---------|
| A | Ollama LLM only | Slow (1-5s), imprecise numerical forecasts |
| B | TensorFlow.js only | Fast but black-box — no natural language explanations |
| **C** | **Hybrid: TF.js + Ollama** | **Best of both — fast predictions + actionable insights** |
| D | Python microservice (Prophet) | Most accurate but adds deployment complexity |

**Decision: Option C — Hybrid**

- **TensorFlow.js** handles fast (~200ms) numerical queue volume forecasts for real-time dashboard charts
- **Ollama** generates natural-language staffing recommendations that managers can act on ("Open counter 3 by 1:30 PM")
- An **InsightProvider abstraction layer** makes the LLM backend swappable — Ollama in dev, Claude/GPT/Mistral API in production if needed

---

## Data Foundation

BléSaf already collects everything a forecasting model needs:

### Existing Data Tables

| Table | Granularity | Key Fields |
|-------|-------------|------------|
| `Ticket` | Per-customer | `createdAt`, `calledAt`, `servingStartedAt`, `completedAt`, `serviceCategoryId`, `branchId` |
| `HourlySnapshot` | Per-hour | `hour` (0-23), `queueLength`, `activeCounters`, `avgWaitTimeMins` |
| `DailyBranchStats` | Per-day | `totalTickets`, `completedTickets`, `noShows`, `avgWaitTimeMins`, `avgServiceTimeMins`, `peakHour` |
| `TellerBreak` | Per-break | `reason`, `durationMins`, `startedAt`, `actualEnd` |
| `BranchTarget` | Per-day | `servedTarget`, `avgWaitTarget`, `slaTarget`, `slaThreshold` |

### Feature Matrix for ML Model

| Feature | Source | Type |
|---------|--------|------|
| `hourOfDay` | timestamp | 0-23 |
| `dayOfWeek` | timestamp | 0-6 (0=Sunday) |
| `isWeekend` | derived | 0 or 1 |
| `weekOfMonth` | derived | 1-5 |
| `avgVolumeThisHourLast7Days` | HourlySnapshot | float |
| `avgVolumeThisHourLast30Days` | HourlySnapshot | float |
| `avgVolumeSameDayLast4Weeks` | DailyBranchStats | float |
| `activeCounters` | HourlySnapshot | int |
| `avgWaitTimePrevHour` | HourlySnapshot | float |
| `ticketCountPrevHour` | Ticket (count) | int |

### Data Gaps to Address

- No data export API for ML training pipelines
- No scheduled aggregation jobs (stats appear computed on-demand)
- No retention policy (data grows indefinitely — good for training, risk for DB perf)
- No feature engineering layer (to be built as part of this plan)

---

## Production Deployment Strategy

### TensorFlow.js — No Extra Infrastructure

TF.js runs inside the Node.js process. No sidecar, no GPU, no separate service. Trained model files (~5-10MB per branch) are saved to filesystem in dev and cloud storage (S3/GCS) in production. Scales horizontally with the API.

### Ollama — Four Deployment Options

| Option | Setup | Best For | Monthly Cost (10 branches) |
|--------|-------|----------|---------------------------|
| 1. Docker sidecar | Same `docker-compose` as API | Pilot, 1-10 branches | ~$20-40 (VM) |
| 2. Dedicated server | Separate VM, 8GB RAM | Growth, 10-50 branches | ~$40-80 (VM) |
| 3. Cloud LLM API | Swap Ollama for Claude/GPT | Scale, 50+ branches | ~$15-45 (usage) |
| 4. Hybrid local+cloud | Ollama primary, cloud fallback | Best reliability | ~$30-60 |

**Recommended trajectory:**
- **Dev/Pilot** → Docker sidecar (Option 1)
- **10+ branches** → Dedicated Ollama server (Option 2)
- **50+ branches** → Cloud LLM API or hybrid (Option 3/4)

### Provider Abstraction Layer

The `InsightProvider` interface ensures the LLM backend is swappable without code changes:

```typescript
interface InsightProvider {
  generateInsights(context: PredictionContext): Promise<StaffingInsight[]>;
}
```

Implementations: `OllamaProvider` (dev/pilot), `ClaudeProvider` or `OpenAIProvider` (production). Switching providers is a config change via environment variable.

---

## Prerequisites (Manual)

1. **Install Ollama** on the dev machine:
   - Download from https://ollama.com/download (Windows installer)
   - Pull a model: `ollama pull llama3.2:3b` (lightweight, ~2GB, fast on CPU)
2. **Install TensorFlow.js**: `pnpm add @tensorflow/tfjs-node` in `apps/api`
3. **Install Ollama JS client**: `pnpm add ollama` in `apps/api`

---

## New Files to Create

### Backend (9 files)

```
apps/api/src/
  services/
    featureEngineering.ts    ← Transforms raw DB data into ML-ready features
    predictionModel.ts       ← TensorFlow.js LSTM model: train, save, load, predict
    predictionService.ts     ← Orchestrates forecasts + caches results in Redis
    insightProvider.ts       ← Abstract interface + factory for swappable LLM providers
    ollamaProvider.ts        ← Ollama implementation of InsightProvider
    predictionQueue.ts       ← BullMQ queue + worker for training & insight jobs
  routes/
    predictions.ts           ← REST endpoints: /api/predictions/branch/:branchId/*
```

### Shared Types (add to existing file)

```
packages/shared/src/types.ts  ← Add ForecastPoint, StaffingInsight, PredictionResponse interfaces
```

### Frontend (1 file modified)

```
apps/web/src/pages/manager/BranchDashboardV2.tsx  ← Replace scaffold with forecast UI
```

---

## Implementation Steps

### Step 1: Shared Types

Add to `packages/shared/src/types.ts`:

```typescript
// --- Prediction Types ---
export interface ForecastPoint {
  hour: number;           // 0-23
  predictedVolume: number; // expected ticket count
  confidence: number;      // 0-1 confidence score
  actualVolume?: number;   // filled in for past hours (overlay)
}

export interface StaffingInsight {
  id: string;
  type: 'peak_alert' | 'staffing_recommendation' | 'break_suggestion' | 'pattern_insight';
  severity: 'info' | 'warning' | 'critical';
  message: string;         // Natural language from LLM
  suggestedAction?: string;
  timeframe?: string;      // e.g. "14:00-15:00"
  generatedAt: Date;
}

export interface BranchForecast {
  branchId: string;
  date: string;            // YYYY-MM-DD
  hourlyForecast: ForecastPoint[];
  peakHour: number;
  peakVolume: number;
  totalPredicted: number;
  modelVersion: string;
  generatedAt: Date;
}

export interface PredictionResponse {
  forecast: BranchForecast;
  insights: StaffingInsight[];
}
```

### Step 2: Feature Engineering Service

**File:** `apps/api/src/services/featureEngineering.ts`

Queries `HourlySnapshot`, `DailyBranchStats`, and `Ticket` tables to produce a normalized feature matrix.

**Key function:** `getTrainingData(branchId: string, days: number)` → returns `{ features: number[][], labels: number[] }`

Reuses query patterns from `analyticsService.ts` — specifically the date range UTC conversion and Prisma groupBy on HourlySnapshot/DailyBranchStats.

### Step 3: TensorFlow.js Prediction Model

**File:** `apps/api/src/services/predictionModel.ts`

**Model architecture** — Simple LSTM for hourly time-series:

```
Input:  [batchSize, sequenceLength=24, features=10]
             ↓
LSTM layer:  32 units, return_sequences=false
             ↓
Dense:       16 units, ReLU
             ↓
Output:      4 units (next 4 hours predicted volume)
```

**Key functions:**
- `buildModel()` → Creates and compiles the TF.js Sequential model
- `trainModel(branchId, data)` → Trains on historical features, saves to `apps/api/models/{branchId}/model.json`
- `loadModel(branchId)` → Loads saved model into memory (called on server start)
- `predict(branchId, currentFeatures)` → Returns `ForecastPoint[]` for next 4 hours (~100-200ms)

**Training config:** Adam optimizer, MSE loss, 50 epochs, batch size 32, 80/20 train/validation split.

**Model storage:** Filesystem at `apps/api/models/{branchId}/` — each branch gets its own trained model.

### Step 4: Insight Provider Abstraction + Ollama Implementation

**File:** `apps/api/src/services/insightProvider.ts`

Abstract interface + factory function that selects provider based on config:

```typescript
interface InsightProvider {
  generateInsights(context: PredictionContext): Promise<StaffingInsight[]>;
  isAvailable(): Promise<boolean>;
}

function createInsightProvider(): InsightProvider  // returns OllamaProvider or future CloudProvider
```

**File:** `apps/api/src/services/ollamaProvider.ts`

Calls local Ollama at `http://localhost:11434` using the `ollama` npm package.

**Prompt template:**
```
You are BléSaf, an AI assistant for bank branch managers in Tunisia.

Current branch metrics:
- Waiting: {waiting} customers
- Active counters: {activeCounters}/{totalCounters}
- Avg wait time: {avgWait} min
- Current time: {time}

Queue forecast for the next 4 hours:
{forecastTable}

Historical pattern: {patternSummary}

Generate 2-3 brief, actionable staffing recommendations in JSON format:
[{ "type": "peak_alert|staffing_recommendation|break_suggestion",
   "severity": "info|warning|critical",
   "message": "...",
   "suggestedAction": "...",
   "timeframe": "HH:MM-HH:MM" }]

Rules:
- Be specific about counter numbers and times
- Reference the forecast data
- Keep messages under 120 characters
- Respond ONLY with valid JSON array, no markdown
```

**Config:**
- Model: `llama3.2:3b` (lightweight, fast on CPU)
- `stream: false` for complete JSON responses
- `temperature: 0.3` for consistent, factual outputs
- `format: json` to enforce JSON output
- Timeout: 30 seconds
- Graceful fallback: if Ollama is unreachable, return empty insights (not an error)

### Step 5: Prediction Queue (BullMQ)

**File:** `apps/api/src/services/predictionQueue.ts`

Follows the exact same pattern as the existing `scheduleQueue.ts`.

**Two job types:**

| Job | Schedule | Purpose |
|-----|----------|---------|
| `train-model` | Daily at 02:00 AM | Retrain TF.js LSTM on last 90 days of data |
| `generate-insights` | Every 10 minutes | Run LLM with latest forecast + current metrics |

**Worker** processes jobs and stores results:
- Training: saves model to filesystem
- Insights: caches in Redis with key `prediction:insights:{branchId}` (TTL 600s)
- Forecast: caches in Redis with key `prediction:forecast:{branchId}` (TTL 300s)

### Step 6: Predictions Route

**File:** `apps/api/src/routes/predictions.ts`

| Endpoint | Method | Auth | Response |
|----------|--------|------|----------|
| `/api/predictions/branch/:branchId/forecast` | GET | BM+ | `BranchForecast` — hourly predictions for today |
| `/api/predictions/branch/:branchId/insights` | GET | BM+ | `StaffingInsight[]` — cached LLM recommendations |
| `/api/predictions/branch/:branchId/train` | POST | Admin | Trigger immediate model retrain |

**Forecast endpoint flow:**
1. Check Redis cache → return if fresh
2. Load TF.js model for branch → run prediction with current features
3. Cache result in Redis (TTL 5 min) → return

**Insights endpoint flow:**
1. Check Redis cache → return if fresh
2. If stale, return stale + trigger background BullMQ job to refresh
3. If no cache exists, return `[]` (insights generate asynchronously)

### Step 7: Wire Into Server

**Modify:** `apps/api/src/index.ts`

```typescript
// Add import
import predictionRoutes from './routes/predictions';
import { predictionService } from './services/predictionService';

// Add route (alongside existing routes)
app.use('/api/predictions', predictionRoutes);

// In start(): after scheduleService.initialize()
await predictionService.initialize(); // loads models, starts BullMQ jobs

// In gracefulShutdown(): before disconnectRedis()
await predictionService.close();
```

**Modify:** `apps/api/src/lib/redis.ts`

Add cache key helpers:
```typescript
export const REDIS_KEYS = {
  // ... existing keys ...
  predictionForecast: (branchId: string) => `prediction:forecast:${branchId}`,
  predictionInsights: (branchId: string) => `prediction:insights:${branchId}`,
};
```

### Step 8: Minimal v2 Dashboard UI

**Modify:** `apps/web/src/pages/manager/BranchDashboardV2.tsx`

Three sections, top to bottom:

1. **Peak Alert Banner** — If any insight has `severity: 'critical'`, show an amber/red banner at the top with the message and suggested action

2. **Forecast Chart** — Recharts `AreaChart` showing:
   - X-axis: hours (8AM-6PM)
   - Y-axis: customer volume
   - Blue area: predicted volume
   - Gray dashed line: actual volume (for past hours)
   - Red dotted vertical line: current time
   - Tooltip: "Predicted: 38 | Actual: 42"

3. **Staffing Insight Cards** — Grid of cards, one per `StaffingInsight`:
   - Color-coded left border (blue=info, amber=warning, red=critical)
   - Icon based on type (groups=staffing, schedule=peak, coffee=break, insights=pattern)
   - Message text + suggested action
   - Timeframe badge

API calls via `axios` using existing `api.ts` client — add two functions:
- `predictionsApi.getForecast(branchId)`
- `predictionsApi.getInsights(branchId)`

Auto-refresh: poll forecast every 60s, insights every 5 min.

---

## Files Modified (Existing)

| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Import + register prediction routes, init/close prediction service |
| `apps/api/src/lib/redis.ts` | Add 2 cache key helpers to `REDIS_KEYS` |
| `packages/shared/src/types.ts` | Add prediction interfaces (ForecastPoint, StaffingInsight, etc.) |
| `apps/web/src/lib/api.ts` | Add `predictionsApi` object with 2 methods |
| `apps/web/src/pages/manager/BranchDashboardV2.tsx` | Replace scaffold with forecast UI |
| `apps/api/package.json` | Add `@tensorflow/tfjs-node` + `ollama` dependencies |

---

## Verification

1. **Install Ollama**: Download, install, `ollama pull llama3.2:3b`, verify with `ollama list`
2. **Install deps**: `pnpm add @tensorflow/tfjs-node ollama` in `apps/api`
3. **Start servers**: `pnpm dev` — confirm no startup errors from prediction service (should log "Prediction service initialized" or gracefully skip if no trained model exists yet)
4. **Trigger training**: `POST /api/predictions/branch/{branchId}/train` — should train model on historical data and save to `apps/api/models/{branchId}/`
5. **Test forecast**: `GET /api/predictions/branch/{branchId}/forecast` — should return hourly predictions
6. **Test insights**: `GET /api/predictions/branch/{branchId}/insights` — should return Ollama-generated recommendations (or empty array if Ollama not running)
7. **Dashboard**: Navigate to `/manager/v2` — verify chart renders with forecast data, insight cards appear
8. **Graceful fallback**: Stop Ollama → insights endpoint returns `[]`, forecast still works from TF.js
