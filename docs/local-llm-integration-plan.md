# Local LLM Integration Architecture for BléSaf Banking

> **Status:** DEFERRED — Implement after first successful UIB demo
> **Decision date:** TBD
> **Prepared:** 2026-02-14

---

## Model Selection & Hardware Requirements

### Models (via Ollama)

| Role | Model | Size | Runs On |
|------|-------|------|---------|
| **Inference** | `mistral:7b-instruct-v0.3` | ~4.5GB VRAM (Q4_K_M quantized) | GPU |
| **Embeddings** | `nomic-embed-text:v1.5` | 137M params | CPU |

**Why Mistral 7B:** Strong instruction-following, native French fluency, structured JSON output, fits consumer GPU. Arabic acceptable for short text.

**Alternatives if needed:** `llama3.1:8b` or `qwen2.5:7b` (better Arabic).

### Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| GPU | NVIDIA RTX 3060 12GB | NVIDIA RTX 4070 12GB |
| RAM | 16 GB | 32 GB |
| Storage | 20 GB (models) | 50 GB |
| CPU | 8-core | 16-core |

Single GPU server. No cluster needed.

---

## Context

BléSaf's current "AI" features are rule-based: a weighted health score formula, EWMA forecasting, and 12 hard-coded recommendation rules (7 branch-level, 5 HQ-level). These tell managers *what* is wrong but never *why*, can't learn from outcomes, detect anomalies, or spot cross-branch patterns. Integrating a local open-source LLM (via Ollama) would transform these into context-aware, explainable intelligence — while keeping all banking data on-premises.

---

## Core Decision: RAG, Not Fine-Tuning

**RAG (Retrieval-Augmented Generation) wins decisively for BléSaf:**

| Factor | RAG | Fine-Tuning |
|--------|-----|-------------|
| Data volume needed | Works with existing data immediately | Needs millions of instruction-response pairs |
| Data freshness | Incorporates today's data in every query | Static snapshot, requires periodic retraining |
| Tenant isolation | SQL `WHERE tenantId =` at retrieval | Risk of cross-tenant leakage in model weights |
| Explainability | Can trace output to exact retrieved records | Black box |
| Operational complexity | Ollama + pgvector (already have PostgreSQL) | GPU training pipeline, model versioning |
| Incremental adoption | Layer on top of existing rules as fallback | Replace existing system |

**Strategy:** Embed structured operational summaries (not raw rows) into pgvector. At inference time, retrieve similar historical contexts and inject them into prompts alongside live metrics. The rule-based system always runs first and serves as fallback.

---

## Architecture Overview

```
+-----------------------------------------------------------+
|  React Frontend (apps/web)                                |
|  - SmartRecommendationCard (explanation + root causes)    |
|  - RootCausePanel, AnomalyAlert, InsightsSummary          |
|  - aiStore extended with new LLM state                    |
+----------------------------+------------------------------+
                             |
+----------------------------v------------------------------+
|  Express Backend (apps/api)                               |
|                                                           |
|  Existing (untouched, serves as fallback):                |
|  +- metricsService     -> health score, capacity, SLA    |
|  +- forecastService    -> EWMA 4h forecast                |
|  +- recommendationEngine -> 7 rules                      |
|                                                           |
|  New LLM Layer:                                           |
|  +- lib/ollama.ts           -> HTTP client wrapper        |
|  +- embeddingService.ts     -> embed + vector search      |
|  +- summaryPipeline.ts      -> data -> text -> embeddings |
|  +- llmService.ts           -> prompt assembly + invoke   |
|  +- smartRecommendationService.ts -> rules + LLM enrich   |
|  +- rootCauseService.ts     -> health decomposition       |
|  +- anomalyService.ts       -> z-score + LLM explain      |
|  +- feedbackService.ts      -> outcome tracking           |
+-----------+----------------------------+------------------+
            |                            |
+-----------v-----------+  +-------------v------------------+
|  PostgreSQL           |  |  Ollama (localhost:11434)      |
|  + pgvector           |  |  +- /api/generate (mistral 7B) |
|  +- OperationalSummary (text + vector(768))               |
|  +- RecommendationOutcome (feedback loop)                 |
|  +- LlmInteractionLog (audit)                            |
+-----------------------+  +--------------------------------+
```

---

## What Gets Embedded (The Knowledge Base)

Raw database rows are too granular. A **summary pipeline** converts operational data into natural language paragraphs, then embeds those:

| Summary Type | Frequency | Example Content |
|---|---|---|
| `hourly_branch` | Every hour (business hours) | "10h-11h: 23 en attente, 4/6 guichets, attente moy 14 min, 3 pauses actives" |
| `daily_branch` | Midnight | "187 tickets, SLA 82%, pic 10h, sous-effectif 9h-11h, score min 42" |
| `daily_tenant` | Midnight | Cross-branch comparison, network patterns |
| `recommendation_outcome` | 15 min after execution | "Ouverture guichet 5 a 10h15 -> score sante +12 points en 20 min" |

**Volume:** ~13 embeddings/branch/day. For 30 branches: ~140K records/year, ~420MB vectors. Negligible for PostgreSQL.

---

## Vector Storage: pgvector (in existing PostgreSQL)

No separate vector DB needed. New Prisma models + raw SQL migration for the vector column:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- OperationalSummary table with embedding vector(768)
-- HNSW index for fast similarity search
```

Queries use `prisma.$queryRaw` with cosine similarity, always scoped by `tenantId`.

---

## The "Enhance, Never Replace" Pattern

Every LLM-powered endpoint follows this:

1. **Always run rule-based first** (existing services)
2. **Check Ollama availability** (cached 30s health check)
3. **If available:** Assemble prompt (current state + rule output + RAG context), call LLM, parse JSON, enrich
4. **If unavailable or timeout (30s):** Return rule-based output with `source: 'rule'`
5. **Log everything** to `LlmInteractionLog`

---

## 6 Use Cases (Prioritized)

### 1. Smart Recommendations with Explanations
**Current:** "Score critique. 15 clients en attente, 2 guichets ouverts."
**With LLM:** "Le score est a 28 parce que Mohamed et Sami sont en pause simultanee depuis 35 min, reduisant la capacite de 60%. Mardi dernier, l'ouverture du guichet 5 a reduit l'attente de 18 a 9 min en 25 minutes."

### 2. Root Cause Analysis
Decomposes health score into its 4 weighted components, identifies the dominant factor, produces a narrative.

### 3. Anomaly Detection
Statistical z-score detection + LLM-generated explanation. Example: "No-show rate 32% vs historical 6%."

### 4. Cross-Branch Patterns (HQ Level)
"Branches in Region Sud consistently degrade after 2pm. Suggestion: stagger lunch breaks."

### 5. Recommendation Feedback Loop
Track outcomes (health/wait/SLA before vs 15 min after). Feed back into RAG context.

### 6. End-of-Day Narrative Summary
Manager-readable recap of the day with highlights and improvement opportunities.

---

## Privacy & Tenant Isolation

- **All inference local** — no external API calls, banking data never leaves infrastructure
- **Tenant isolation:** Every vector query includes `WHERE tenantId =`
- **Stateless inference:** Ollama has no memory between requests
- **Audit trail:** `LlmInteractionLog` records every call
- **Feature flag:** `LLM_ENABLED=false` by default

---

## New Files Summary

### Backend (`apps/api/src/`)
| File | Purpose |
|------|---------|
| `lib/ollama.ts` | Ollama HTTP client (generate, embed, health check) |
| `services/embeddingService.ts` | Embed text, store/query vectors via pgvector |
| `services/summaryPipeline.ts` | Cron: data -> text -> embeddings |
| `services/llmService.ts` | Core: prompt assembly, invoke, parse |
| `services/smartRecommendationService.ts` | Rules + LLM enrichment |
| `services/rootCauseService.ts` | Health decomposition + LLM narrative |
| `services/anomalyService.ts` | Z-score detection + LLM explanation |
| `services/feedbackService.ts` | Recommendation outcome tracking |

### Frontend (`apps/web/src/`)
| File | Purpose |
|------|---------|
| `components/manager/SmartRecommendationCard.tsx` | Card with explanation + root causes |
| `components/manager/RootCausePanel.tsx` | Health decomposition display |
| `components/manager/AnomalyAlert.tsx` | Anomaly notification |
| `components/manager/InsightsSummary.tsx` | Daily AI narrative |

---

## Implementation Phases

### Phase 1: Foundation (2-3 weeks)
- Install Ollama, pull models, verify GPU inference
- Prisma migration: pgvector + 3 new tables
- Implement ollama client, embedding service, summary pipeline
- Run pipeline 1-2 weeks to build vector store
- `LLM_ENABLED=false`

### Phase 2: Core Intelligence (3-4 weeks)
- LLM service, smart recommendations, root cause, anomaly detection
- New API endpoints, frontend components
- Integrate into BranchDashboardV2
- `LLM_ENABLED=true`

### Phase 3: Feedback Loop + Cross-Branch (2-3 weeks)
- Outcome tracking, feed back into RAG
- Cross-branch pattern detection for HQ
- Daily narrative summaries

### Phase 4: Advanced (evaluate after 3-6 months of RAG)
- Fine-tune with LoRA if RAG quality plateaus
- Arabic quality improvement
- Predictive staffing recommendations
