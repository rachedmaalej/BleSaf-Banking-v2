# BleSaf LLM Integration Architecture
## Intelligent Branch Manager Dashboard with Ollama

**Author:** Manus AI
**Date:** February 8, 2026

## Executive Summary

Integrating an open-source Large Language Model (LLM) via Ollama into the BleSaf queue management system is not only feasible but highly recommended. This document outlines a comprehensive technical architecture that leverages Ollama to provide context-aware recommendations, predictive demand forecasting, and intelligent decision support for branch managers. The proposed solution maintains the existing system architecture while adding an AI layer that operates asynchronously, ensuring minimal impact on real-time performance.

## 1. Architecture Overview

### 1.1. System Components

The enhanced BleSaf system will consist of the following components working in concert:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend Dashboard** | React + TypeScript + Tailwind CSS | User interface for branch managers |
| **Backend API** | Node.js + Express/Fastify | Existing REST API and WebSocket server |
| **Database** | MySQL/PostgreSQL | Existing queue and operational data |
| **LLM Service** | Ollama + Llama 3.1 (or similar) | AI-powered recommendations and predictions |
| **Context Builder** | Node.js Service | Aggregates data for LLM prompts |
| **Recommendation Cache** | Redis | Stores recent recommendations to reduce LLM calls |

### 1.2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BRANCH MANAGER DASHBOARD                     │
│                     (React + TypeScript)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ WebSocket + REST API
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API SERVER                           │
│                  (Node.js + Express/Fastify)                    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Queue        │  │ WebSocket    │  │ Recommendation     │   │
│  │ Management   │  │ Handler      │  │ Controller         │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└────────┬────────────────────────────────────┬──────────────────┘
         │                                    │
         ↓                                    ↓
┌─────────────────────┐          ┌──────────────────────────────┐
│   DATABASE          │          │   LLM INTELLIGENCE SERVICE   │
│   (MySQL/Postgres)  │          │   (Ollama Integration)       │
│                     │          │                              │
│  • Queue Data       │          │  ┌────────────────────────┐  │
│  • Teller Perf.     │          │  │  Context Builder       │  │
│  • Historical Data  │          │  │  (Data Aggregator)     │  │
│  • SLA Metrics      │          │  └───────────┬────────────┘  │
└─────────────────────┘          │              ↓               │
                                 │  ┌────────────────────────┐  │
                                 │  │  Ollama Client         │  │
                                 │  │  (ollama-js library)   │  │
                                 │  └───────────┬────────────┘  │
                                 │              ↓               │
                                 │  ┌────────────────────────┐  │
                                 │  │  Recommendation Cache  │  │
                                 │  │  (Redis)               │  │
                                 │  └────────────────────────┘  │
                                 └──────────────┬───────────────┘
                                                ↓
                                 ┌──────────────────────────────┐
                                 │   OLLAMA SERVER              │
                                 │   (Local or Remote)          │
                                 │                              │
                                 │   Model: llama3.1:8b or      │
                                 │          mistral:7b          │
                                 └──────────────────────────────┘
```

### 1.3. Data Flow

The system operates in two parallel flows to maintain real-time responsiveness while providing intelligent insights.

**Real-Time Flow (Existing):**
1. Customer checks in → Queue updated in database
2. WebSocket broadcasts update to dashboard
3. Dashboard displays current state immediately

**Intelligence Flow (New):**
1. Every 2-3 minutes, Context Builder aggregates operational data
2. Context Builder sends structured prompt to Ollama
3. Ollama generates recommendations based on current context
4. Recommendations are cached in Redis
5. Dashboard polls or receives WebSocket update with new recommendations
6. Branch manager reviews and executes recommendations

## 2. LLM Service Architecture

### 2.1. Ollama Setup

Ollama can be deployed in two configurations depending on infrastructure requirements.

#### Option A: Local Deployment (Recommended for Production)
**Advantages:**
- Complete data privacy (no data leaves premises)
- Lower latency (local network)
- No API costs
- Full control over model selection

**Requirements:**
- Server with GPU (NVIDIA recommended)
- Minimum: 16GB RAM, 8GB VRAM
- Recommended: 32GB RAM, 16GB VRAM for larger models

**Installation:**
```bash
# Install Ollama on Linux server
curl -fsSL https://ollama.com/install.sh | sh

# Pull recommended model
ollama pull llama3.1:8b

# Verify installation
ollama run llama3.1:8b "Test prompt"
```

#### Option B: Cloud Deployment
**Advantages:**
- No hardware requirements
- Scalable on demand
- Easy setup

**Considerations:**
- Data privacy concerns (data sent to Ollama cloud)
- API costs
- Requires internet connectivity

### 2.2. Model Selection

Recommended models for the BleSaf use case, ranked by capability and resource requirements:

| Model | Size | RAM Required | Speed | Reasoning Quality | Recommendation |
|-------|------|--------------|-------|-------------------|----------------|
| **Llama 3.1:8B** | 4.7GB | 8GB | Fast | Excellent | **Best for production** |
| **Mistral:7B** | 4.1GB | 8GB | Very Fast | Very Good | Good alternative |
| **Llama 3.1:70B** | 40GB | 64GB | Slow | Outstanding | Only if high-end hardware available |
| **Qwen2.5:7B** | 4.7GB | 8GB | Fast | Very Good | Good for multilingual support |

**Recommendation:** Start with **Llama 3.1:8B** for the best balance of performance, speed, and resource efficiency.

### 2.3. Context Builder Service

The Context Builder is a critical component that transforms raw operational data into structured prompts for the LLM.

#### Responsibilities
1. **Data Aggregation:** Collect current queue state, teller performance, historical patterns
2. **Feature Engineering:** Calculate derived metrics (queue velocity, SLA risk score, capacity utilization)
3. **Prompt Construction:** Format data into natural language prompt with clear instructions
4. **Response Parsing:** Extract structured recommendations from LLM output

#### Key Metrics to Include in Context
```javascript
const context = {
  timestamp: "2026-02-08 14:15:00",
  branch: {
    id: "LAC2",
    name: "Agence Lac 2",
    maxCounters: 4,
    slaThreshold: 15 // minutes
  },
  currentState: {
    queueLength: 8,
    averageWaitTime: 5.2, // minutes
    slaCompliance: 100, // percentage
    activeCounters: 2,
    availableCounters: 2
  },
  queueComposition: [
    { service: "Dépôt d'espèces", count: 5, avgWait: 12 },
    { service: "Retrait d'espèces", count: 2, avgWait: 4 },
    { service: "Relevés de compte", count: 1, avgWait: 2 }
  ],
  tellerPerformance: [
    { id: "G1", name: "Mohamed Sassi", ticketsPerHour: 8, status: "serving" },
    { id: "G2", name: "Leila Hamdi", ticketsPerHour: 6, status: "idle" }
  ],
  derivedMetrics: {
    queueVelocity: +3, // customers/hour (positive = growing)
    capacityUtilization: 85, // percentage
    slaRiskCount: 3, // customers at risk
    predictedDemand: { min: 15, max: 18 } // next hour
  },
  historicalContext: {
    typicalQueueAtThisTime: 6,
    typicalWaitTime: 4.5,
    peakHourStart: "14:00",
    peakHourEnd: "16:00"
  }
}
```

## 3. Prompt Engineering

### 3.1. System Prompt (Persistent)

The system prompt defines the LLM's role and establishes constraints.

```
You are an AI assistant specialized in optimizing bank branch operations and queue management. Your role is to analyze real-time operational data and provide actionable recommendations to branch managers.

CONSTRAINTS:
- Recommendations must be specific, actionable, and implementable within 5 minutes
- Always consider customer experience (minimize wait times) and operational efficiency (optimize resource usage)
- Prioritize SLA compliance above all else
- Provide confidence scores (0-100%) for each recommendation
- Explain the expected impact of each recommendation in quantifiable terms

OUTPUT FORMAT:
You must respond with valid JSON only, no additional text. Use this exact structure:
{
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Brief description of action",
      "reasoning": "Why this action is recommended",
      "impact": {
        "waitTimeReduction": "X minutes",
        "affectedCustomers": N,
        "slaImpact": "positive|neutral|negative"
      },
      "confidence": 94,
      "implementation": "Step-by-step instructions"
    }
  ],
  "alerts": [
    {
      "severity": "critical|warning|info",
      "message": "Alert description"
    }
  ],
  "insights": [
    "Key observation about current operations"
  ]
}
```

### 3.2. User Prompt (Dynamic)

The user prompt contains the current operational context.

```javascript
function buildUserPrompt(context) {
  return `
CURRENT BRANCH STATUS (${context.timestamp}):
Branch: ${context.branch.name} (${context.branch.id})

QUEUE STATE:
- Total customers waiting: ${context.currentState.queueLength}
- Average wait time: ${context.currentState.averageWaitTime} minutes
- SLA compliance: ${context.currentState.slaCompliance}%
- Active counters: ${context.currentState.activeCounters}/${context.branch.maxCounters}

QUEUE COMPOSITION:
${context.queueComposition.map(s => 
  `- ${s.service}: ${s.count} waiting (avg ${s.avgWait} min)`
).join('\n')}

TELLER PERFORMANCE:
${context.tellerPerformance.map(t => 
  `- ${t.id} (${t.name}): ${t.ticketsPerHour} tickets/hour, ${t.status}`
).join('\n')}

KEY METRICS:
- Queue velocity: ${context.derivedMetrics.queueVelocity > 0 ? '+' : ''}${context.derivedMetrics.queueVelocity} customers/hour (${context.derivedMetrics.queueVelocity > 0 ? 'GROWING' : 'SHRINKING'})
- Capacity utilization: ${context.derivedMetrics.capacityUtilization}%
- Customers at SLA risk (>12 min wait): ${context.derivedMetrics.slaRiskCount}
- Predicted demand (next hour): ${context.derivedMetrics.predictedDemand.min}-${context.derivedMetrics.predictedDemand.max} customers

HISTORICAL CONTEXT:
- Typical queue at this time: ${context.historicalContext.typicalQueueAtThisTime} customers
- Typical wait time: ${context.historicalContext.typicalWaitTime} minutes
- Currently in peak hours: ${context.historicalContext.peakHourStart} - ${context.historicalContext.peakHourEnd}

TASK:
Analyze this data and provide 1-3 prioritized recommendations for the branch manager. Focus on:
1. Preventing SLA breaches (customers waiting >15 minutes)
2. Optimizing counter allocation based on service demand
3. Balancing workload across tellers
4. Preparing for predicted demand changes

Respond with valid JSON only.
`;
}
```

### 3.3. Example LLM Response

```json
{
  "recommendations": [
    {
      "priority": "high",
      "action": "Open Counter 3 and assign exclusively to Dépôt d'espèces service",
      "reasoning": "5 customers waiting for Dépôt d'espèces with average wait of 12 minutes (80% of SLA threshold). Queue velocity is +3 customers/hour, indicating continued growth. This service represents 62% of current queue.",
      "impact": {
        "waitTimeReduction": "6 minutes",
        "affectedCustomers": 5,
        "slaImpact": "positive"
      },
      "confidence": 94,
      "implementation": "1. Notify available teller to open Counter 3\n2. Configure counter for Dépôt d'espèces only\n3. Route next 5 Dépôt customers to this counter\n4. Monitor impact over next 15 minutes"
    },
    {
      "priority": "medium",
      "action": "Provide coaching to Teller G2 (Leila Hamdi) on efficiency",
      "reasoning": "G2 is processing 6 tickets/hour compared to G1's 8 tickets/hour (25% slower). This represents a 2 tickets/hour capacity loss. Current idle status provides opportunity for brief coaching.",
      "impact": {
        "waitTimeReduction": "1-2 minutes",
        "affectedCustomers": 8,
        "slaImpact": "neutral"
      },
      "confidence": 78,
      "implementation": "1. Review G2's recent transactions for bottlenecks\n2. Provide 5-minute refresher on common service procedures\n3. Monitor performance over next hour"
    },
    {
      "priority": "low",
      "action": "Schedule breaks for 15:00-15:30 (low-demand window)",
      "reasoning": "Currently in peak hours (14:00-16:00). Historical data shows demand typically drops after 15:00. Scheduling breaks during this window minimizes customer impact.",
      "impact": {
        "waitTimeReduction": "0 minutes",
        "affectedCustomers": 0,
        "slaImpact": "neutral"
      },
      "confidence": 88,
      "implementation": "1. Notify tellers of planned break schedule\n2. Stagger breaks (15:00 for G1, 15:15 for G2)\n3. Keep at least 2 counters active at all times"
    }
  ],
  "alerts": [
    {
      "severity": "warning",
      "message": "Queue velocity is positive (+3 customers/hour) while only 2/4 counters are active. Without intervention, expect SLA breach within 45 minutes."
    },
    {
      "severity": "info",
      "message": "Current performance is below typical for this time (8 waiting vs. typical 6). Consider proactive staffing."
    }
  ],
  "insights": [
    "Dépôt d'espèces service is the primary bottleneck, representing 62% of queue but only served by general-purpose counters",
    "Overall capacity utilization of 85% is healthy, but service-specific allocation is suboptimal",
    "G1 is performing 33% above G2, indicating potential for knowledge transfer or process improvement"
  ]
}
```

## 4. Implementation Guide

### 4.1. Backend Service Structure

```
blesaf-backend/
├── src/
│   ├── controllers/
│   │   ├── queueController.js       # Existing queue management
│   │   └── recommendationController.js  # NEW: LLM recommendations
│   ├── services/
│   │   ├── queueService.js          # Existing queue logic
│   │   ├── contextBuilder.js        # NEW: Aggregates data for LLM
│   │   ├── ollamaService.js         # NEW: Ollama API client
│   │   └── recommendationCache.js   # NEW: Redis caching
│   ├── models/
│   │   ├── Queue.js
│   │   ├── Teller.js
│   │   └── Recommendation.js        # NEW: Store recommendations
│   ├── utils/
│   │   ├── metrics.js               # NEW: Calculate derived metrics
│   │   └── prompts.js               # NEW: Prompt templates
│   └── config/
│       └── ollama.js                # NEW: Ollama configuration
├── package.json
└── .env
```

### 4.2. Installation and Setup

**Step 1: Install Dependencies**
```bash
cd blesaf-backend
npm install ollama redis ioredis
```

**Step 2: Environment Configuration**
```bash
# .env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
REDIS_URL=redis://localhost:6379
RECOMMENDATION_INTERVAL=120000  # 2 minutes in milliseconds
```

**Step 3: Initialize Ollama Service**

Create `src/services/ollamaService.js`:
```javascript
import { Ollama } from 'ollama';
import { systemPrompt } from '../utils/prompts.js';

class OllamaService {
  constructor() {
    this.client = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  }

  async generateRecommendations(context) {
    try {
      const userPrompt = this.buildUserPrompt(context);
      
      const response = await this.client.chat({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        format: 'json', // Ensure JSON output
        options: {
          temperature: 0.3, // Lower temperature for more consistent outputs
          top_p: 0.9
        }
      });

      const recommendations = JSON.parse(response.message.content);
      return recommendations;
    } catch (error) {
      console.error('Ollama service error:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  buildUserPrompt(context) {
    return `
CURRENT BRANCH STATUS (${context.timestamp}):
Branch: ${context.branch.name}

QUEUE STATE:
- Total waiting: ${context.currentState.queueLength}
- Avg wait: ${context.currentState.averageWaitTime} min
- SLA: ${context.currentState.slaCompliance}%
- Active counters: ${context.currentState.activeCounters}/${context.branch.maxCounters}

QUEUE COMPOSITION:
${context.queueComposition.map(s => 
  `- ${s.service}: ${s.count} waiting (${s.avgWait} min avg)`
).join('\n')}

TELLER PERFORMANCE:
${context.tellerPerformance.map(t => 
  `- ${t.id}: ${t.ticketsPerHour} tickets/hr, ${t.status}`
).join('\n')}

KEY METRICS:
- Queue velocity: ${context.derivedMetrics.queueVelocity > 0 ? '+' : ''}${context.derivedMetrics.queueVelocity}/hr
- Capacity: ${context.derivedMetrics.capacityUtilization}%
- SLA risk: ${context.derivedMetrics.slaRiskCount} customers

Provide 1-3 actionable recommendations with JSON format only.
    `.trim();
  }

  async testConnection() {
    try {
      const response = await this.client.chat({
        model: this.model,
        messages: [{ role: 'user', content: 'Respond with "OK"' }]
      });
      return response.message.content.includes('OK');
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }
}

export default new OllamaService();
```

**Step 4: Create Context Builder**

Create `src/services/contextBuilder.js`:
```javascript
import { Queue, Teller, HourlySnapshot } from '../models/index.js';
import { calculateQueueVelocity, calculateCapacityUtilization } from '../utils/metrics.js';

class ContextBuilder {
  async buildContext(branchId) {
    const [
      queueData,
      tellerData,
      historicalData
    ] = await Promise.all([
      this.getQueueState(branchId),
      this.getTellerPerformance(branchId),
      this.getHistoricalContext(branchId)
    ]);

    const derivedMetrics = this.calculateDerivedMetrics(queueData, tellerData);

    return {
      timestamp: new Date().toISOString(),
      branch: {
        id: branchId,
        name: await this.getBranchName(branchId),
        maxCounters: 4,
        slaThreshold: 15
      },
      currentState: queueData.summary,
      queueComposition: queueData.byService,
      tellerPerformance: tellerData,
      derivedMetrics,
      historicalContext: historicalData
    };
  }

  async getQueueState(branchId) {
    const tickets = await Queue.findAll({
      where: { branchId, status: 'waiting' },
      include: ['service']
    });

    const summary = {
      queueLength: tickets.length,
      averageWaitTime: this.calculateAvgWait(tickets),
      slaCompliance: this.calculateSLACompliance(tickets),
      activeCounters: await this.getActiveCounterCount(branchId),
      availableCounters: await this.getAvailableCounterCount(branchId)
    };

    const byService = this.groupByService(tickets);

    return { summary, byService };
  }

  async getTellerPerformance(branchId) {
    const tellers = await Teller.findAll({
      where: { branchId, status: ['active', 'idle'] }
    });

    return Promise.all(tellers.map(async (teller) => ({
      id: teller.counterId,
      name: teller.name,
      ticketsPerHour: await this.calculateTicketsPerHour(teller.id),
      status: teller.status
    })));
  }

  calculateDerivedMetrics(queueData, tellerData) {
    return {
      queueVelocity: calculateQueueVelocity(queueData),
      capacityUtilization: calculateCapacityUtilization(queueData, tellerData),
      slaRiskCount: this.countSLARisk(queueData),
      predictedDemand: this.predictDemand()
    };
  }

  // Helper methods...
  calculateAvgWait(tickets) {
    if (tickets.length === 0) return 0;
    const totalWait = tickets.reduce((sum, t) => {
      return sum + (Date.now() - new Date(t.createdAt)) / 60000;
    }, 0);
    return Math.round(totalWait / tickets.length * 10) / 10;
  }

  groupByService(tickets) {
    const grouped = {};
    tickets.forEach(ticket => {
      const service = ticket.service.name;
      if (!grouped[service]) {
        grouped[service] = { service, count: 0, totalWait: 0 };
      }
      grouped[service].count++;
      grouped[service].totalWait += (Date.now() - new Date(ticket.createdAt)) / 60000;
    });

    return Object.values(grouped).map(g => ({
      service: g.service,
      count: g.count,
      avgWait: Math.round(g.totalWait / g.count * 10) / 10
    }));
  }

  countSLARisk(queueData) {
    const riskThreshold = 12; // 80% of 15 min SLA
    return queueData.summary.queueLength > 0 
      ? Math.ceil(queueData.summary.queueLength * 0.3) // Estimate
      : 0;
  }
}

export default new ContextBuilder();
```

**Step 5: Create Recommendation Controller**

Create `src/controllers/recommendationController.js`:
```javascript
import ollamaService from '../services/ollamaService.js';
import contextBuilder from '../services/contextBuilder.js';
import recommendationCache from '../services/recommendationCache.js';

export const getRecommendations = async (req, res) => {
  try {
    const { branchId } = req.params;

    // Check cache first
    const cached = await recommendationCache.get(branchId);
    if (cached) {
      return res.json({
        recommendations: cached,
        cached: true,
        generatedAt: cached.timestamp
      });
    }

    // Build context from current operational data
    const context = await contextBuilder.buildContext(branchId);

    // Generate recommendations via Ollama
    const recommendations = await ollamaService.generateRecommendations(context);

    // Cache for 2 minutes
    await recommendationCache.set(branchId, recommendations, 120);

    res.json({
      recommendations,
      cached: false,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      fallback: {
        recommendations: [],
        alerts: [{
          severity: 'info',
          message: 'AI recommendations temporarily unavailable'
        }]
      }
    });
  }
};

export const refreshRecommendations = async (req, res) => {
  try {
    const { branchId } = req.params;

    // Force refresh by clearing cache
    await recommendationCache.delete(branchId);

    // Generate new recommendations
    const context = await contextBuilder.buildContext(branchId);
    const recommendations = await ollamaService.generateRecommendations(context);

    await recommendationCache.set(branchId, recommendations, 120);

    res.json({
      recommendations,
      refreshed: true,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh recommendations' });
  }
};
```

**Step 6: Add Routes**

Update `src/routes/index.js`:
```javascript
import express from 'express';
import { getRecommendations, refreshRecommendations } from '../controllers/recommendationController.js';

const router = express.Router();

// Existing routes...
router.get('/queue/:branchId', getQueue);
router.post('/queue/:branchId/ticket', createTicket);

// NEW: Recommendation routes
router.get('/recommendations/:branchId', getRecommendations);
router.post('/recommendations/:branchId/refresh', refreshRecommendations);

export default router;
```

### 4.3. Frontend Integration

**Step 1: Create Recommendation Hook**

Create `src/hooks/useRecommendations.ts`:
```typescript
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reasoning: string;
  impact: {
    waitTimeReduction: string;
    affectedCustomers: number;
    slaImpact: string;
  };
  confidence: number;
  implementation: string;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  alerts: Array<{ severity: string; message: string }>;
  insights: string[];
  generatedAt: string;
  cached: boolean;
}

export function useRecommendations(branchId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['recommendations', branchId],
    queryFn: async () => {
      const response = await fetch(`/api/recommendations/${branchId}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json() as Promise<RecommendationsResponse>;
    },
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 60000 // Consider stale after 1 minute
  });

  return {
    recommendations: data?.recommendations || [],
    alerts: data?.alerts || [],
    insights: data?.insights || [],
    isLoading,
    error,
    refresh: refetch,
    lastUpdated: data?.generatedAt
  };
}
```

**Step 2: Create Recommendation Panel Component**

Create `src/components/RecommendationPanel.tsx`:
```typescript
import React from 'react';
import { useRecommendations } from '../hooks/useRecommendations';
import { AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';

interface Props {
  branchId: string;
}

export function RecommendationPanel({ branchId }: Props) {
  const { recommendations, alerts, isLoading, lastUpdated, refresh } = useRecommendations(branchId);

  if (isLoading) {
    return <div className="animate-pulse">Loading recommendations...</div>;
  }

  const highPriority = recommendations.filter(r => r.priority === 'high');
  const mediumPriority = recommendations.filter(r => r.priority === 'medium');
  const lowPriority = recommendations.filter(r => r.priority === 'low');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold">AI-Powered Recommendations</h2>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 p-3 rounded-lg ${
                alert.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                alert.severity === 'warning' ? 'bg-amber-50 border border-amber-200' :
                'bg-blue-50 border border-blue-200'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                alert.severity === 'critical' ? 'text-red-600' :
                alert.severity === 'warning' ? 'text-amber-600' :
                'text-blue-600'
              }`} />
              <p className="text-sm">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {highPriority.map((rec, idx) => (
          <RecommendationCard key={idx} recommendation={rec} priority="high" />
        ))}
        {mediumPriority.map((rec, idx) => (
          <RecommendationCard key={idx} recommendation={rec} priority="medium" />
        ))}
        {lowPriority.map((rec, idx) => (
          <RecommendationCard key={idx} recommendation={rec} priority="low" />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <img src="/ollama-logo.svg" alt="Ollama" className="w-4 h-4" />
          <span>Powered by Ollama LLM</span>
        </div>
        <button
          onClick={() => refresh()}
          className="text-blue-600 hover:text-blue-700"
        >
          Refresh now
        </button>
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation, priority }) {
  const borderColor = {
    high: 'border-red-300',
    medium: 'border-amber-300',
    low: 'border-gray-300'
  }[priority];

  const bgColor = {
    high: 'bg-red-50',
    medium: 'bg-amber-50',
    low: 'bg-gray-50'
  }[priority];

  return (
    <div className={`border-2 ${borderColor} ${bgColor} rounded-lg p-4`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm">{recommendation.action}</h3>
        <span className="text-xs bg-white px-2 py-1 rounded">
          {recommendation.confidence}% confident
        </span>
      </div>

      <p className="text-sm text-gray-700 mb-3">{recommendation.reasoning}</p>

      <div className="space-y-1 text-xs text-gray-600 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          <span>Impact: {recommendation.impact.waitTimeReduction}</span>
        </div>
        <div>Affects: {recommendation.impact.affectedCustomers} customers</div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700">
          Execute Now
        </button>
        <button className="px-3 border border-gray-300 text-sm rounded hover:bg-gray-100">
          Details
        </button>
      </div>
    </div>
  );
}
```

## 5. Predictive Demand Forecasting

### 5.1. Historical Data Collection

To enable accurate demand forecasting, the system must collect and store historical patterns.

**Database Schema Addition:**
```sql
CREATE TABLE hourly_snapshots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  branch_id VARCHAR(50) NOT NULL,
  snapshot_time DATETIME NOT NULL,
  hour_of_day INT NOT NULL,
  day_of_week INT NOT NULL,
  customers_arrived INT NOT NULL,
  customers_served INT NOT NULL,
  avg_wait_time DECIMAL(5,2),
  sla_compliance DECIMAL(5,2),
  active_counters INT,
  INDEX idx_branch_time (branch_id, snapshot_time),
  INDEX idx_branch_hour_day (branch_id, hour_of_day, day_of_week)
);
```

### 5.2. Forecasting Algorithm

Create `src/services/demandForecaster.js`:
```javascript
import { HourlySnapshot } from '../models/index.js';
import { Op } from 'sequelize';

class DemandForecaster {
  async predictNextHour(branchId) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Get historical data for same hour/day over last 4 weeks
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const historicalData = await HourlySnapshot.findAll({
      where: {
        branch_id: branchId,
        hour_of_day: currentHour,
        day_of_week: currentDay,
        snapshot_time: { [Op.gte]: fourWeeksAgo }
      },
      order: [['snapshot_time', 'DESC']]
    });

    if (historicalData.length === 0) {
      return { min: 5, max: 15, confidence: 'low' };
    }

    // Calculate average and standard deviation
    const arrivals = historicalData.map(d => d.customers_arrived);
    const avg = arrivals.reduce((a, b) => a + b, 0) / arrivals.length;
    const stdDev = Math.sqrt(
      arrivals.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / arrivals.length
    );

    // Apply recent trend adjustment
    const recentTrend = await this.calculateRecentTrend(branchId);
    const adjustedAvg = avg * (1 + recentTrend);

    return {
      min: Math.max(0, Math.round(adjustedAvg - stdDev)),
      max: Math.round(adjustedAvg + stdDev),
      confidence: historicalData.length >= 4 ? 'high' : 'medium',
      historicalAverage: Math.round(avg)
    };
  }

  async calculateRecentTrend(branchId) {
    const lastTwoHours = await HourlySnapshot.findAll({
      where: { branch_id: branchId },
      order: [['snapshot_time', 'DESC']],
      limit: 2
    });

    if (lastTwoHours.length < 2) return 0;

    const recent = lastTwoHours[0].customers_arrived;
    const previous = lastTwoHours[1].customers_arrived;
    
    return (recent - previous) / previous;
  }
}

export default new DemandForecaster();
```

### 5.3. Integrating Forecasts with LLM

The demand forecast is included in the context sent to the LLM, allowing it to make proactive recommendations.

```javascript
// In contextBuilder.js
async getHistoricalContext(branchId) {
  const forecast = await demandForecaster.predictNextHour(branchId);
  
  return {
    typicalQueueAtThisTime: await this.getTypicalQueue(branchId),
    typicalWaitTime: await this.getTypicalWaitTime(branchId),
    peakHourStart: "14:00",
    peakHourEnd: "16:00",
    predictedDemand: forecast
  };
}
```

## 6. Performance Optimization

### 6.1. Caching Strategy

Use Redis to cache recommendations and reduce LLM calls.

```javascript
// src/services/recommendationCache.js
import Redis from 'ioredis';

class RecommendationCache {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async get(branchId) {
    const cached = await this.redis.get(`recommendations:${branchId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async set(branchId, recommendations, ttlSeconds = 120) {
    await this.redis.setex(
      `recommendations:${branchId}`,
      ttlSeconds,
      JSON.stringify(recommendations)
    );
  }

  async delete(branchId) {
    await this.redis.del(`recommendations:${branchId}`);
  }
}

export default new RecommendationCache();
```

### 6.2. Async Processing

Run LLM inference asynchronously to avoid blocking the main request thread.

```javascript
// Background job that runs every 2 minutes
import cron from 'node-cron';
import contextBuilder from './services/contextBuilder.js';
import ollamaService from './services/ollamaService.js';
import recommendationCache from './services/recommendationCache.js';

// Run every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  const branches = await Branch.findAll({ where: { active: true } });
  
  for (const branch of branches) {
    try {
      const context = await contextBuilder.buildContext(branch.id);
      const recommendations = await ollamaService.generateRecommendations(context);
      await recommendationCache.set(branch.id, recommendations, 120);
      
      // Broadcast via WebSocket
      io.to(`branch:${branch.id}`).emit('recommendations:updated', recommendations);
    } catch (error) {
      console.error(`Failed to generate recommendations for ${branch.id}:`, error);
    }
  }
});
```

### 6.3. Fallback Mechanisms

Implement graceful degradation when LLM is unavailable.

```javascript
async generateRecommendations(context) {
  try {
    return await ollamaService.generateRecommendations(context);
  } catch (error) {
    console.error('LLM unavailable, using rule-based fallback');
    return this.generateRuleBasedRecommendations(context);
  }
}

generateRuleBasedRecommendations(context) {
  const recommendations = [];

  // Rule 1: Open counter if queue velocity is positive
  if (context.derivedMetrics.queueVelocity > 0 && 
      context.currentState.availableCounters > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Open an additional counter',
      reasoning: 'Queue is growing faster than service rate',
      impact: { waitTimeReduction: 'Estimated 3-5 minutes', affectedCustomers: context.currentState.queueLength },
      confidence: 85
    });
  }

  // Rule 2: Alert on SLA risk
  if (context.derivedMetrics.slaRiskCount > 2) {
    recommendations.push({
      priority: 'high',
      action: 'Prioritize customers at SLA risk',
      reasoning: `${context.derivedMetrics.slaRiskCount} customers approaching SLA threshold`,
      impact: { slaImpact: 'positive' },
      confidence: 95
    });
  }

  return { recommendations, alerts: [], insights: ['Using rule-based recommendations'] };
}
```

## 7. Deployment Considerations

### 7.1. Hardware Requirements

| Deployment Scale | CPU | RAM | GPU | Storage |
|------------------|-----|-----|-----|---------|
| **Single Branch (Dev)** | 4 cores | 16GB | Optional | 50GB |
| **Multi-Branch (Production)** | 8 cores | 32GB | NVIDIA T4 or better | 100GB |
| **Enterprise (>10 branches)** | 16 cores | 64GB | NVIDIA A10 or better | 200GB |

### 7.2. Scalability

For multiple branches, consider these architectures:

**Option A: Centralized LLM Server**
- Single Ollama instance serves all branches
- Pros: Lower hardware costs, easier maintenance
- Cons: Single point of failure, potential latency

**Option B: Distributed LLM Instances**
- Each region has its own Ollama instance
- Pros: Better reliability, lower latency
- Cons: Higher costs, more complex deployment

### 7.3. Monitoring

Track these metrics to ensure system health:

```javascript
// Metrics to monitor
const metrics = {
  llm: {
    responseTime: 'Average time for LLM to generate recommendations',
    successRate: 'Percentage of successful LLM calls',
    cacheHitRate: 'Percentage of requests served from cache'
  },
  recommendations: {
    acceptanceRate: 'Percentage of recommendations executed by managers',
    impactAccuracy: 'Actual vs. predicted impact'
  },
  system: {
    cpuUsage: 'Ollama server CPU utilization',
    memoryUsage: 'Ollama server memory usage',
    queueLength: 'Number of pending LLM requests'
  }
};
```

## 8. Cost Analysis

### 8.1. Local Deployment (Recommended)

**One-Time Costs:**
- Server hardware: $2,000 - $5,000
- GPU (optional but recommended): $1,000 - $3,000
- Setup and configuration: $1,000

**Ongoing Costs:**
- Electricity: ~$50/month
- Maintenance: $200/month
- **Total Year 1:** ~$8,000 - $12,000

### 8.2. Cloud Deployment

**Ongoing Costs (per month):**
- Ollama Cloud API: ~$0.001 per request
- Estimated 10,000 requests/month: $10/month
- Infrastructure (Redis, hosting): $50/month
- **Total Year 1:** ~$720

**Recommendation:** For production with >5 branches, local deployment is more cost-effective long-term.

## 9. Security Considerations

### 9.1. Data Privacy

All operational data (customer wait times, teller performance) stays within the organization when using local Ollama deployment. No customer PII is sent to the LLM.

### 9.2. Access Control

```javascript
// Middleware to restrict recommendation access
export const requireManagerRole = (req, res, next) => {
  if (req.user.role !== 'branch_manager' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

// Apply to routes
router.get('/recommendations/:branchId', requireManagerRole, getRecommendations);
```

### 9.3. Audit Logging

Log all recommendations and manager actions for compliance.

```javascript
await AuditLog.create({
  branchId,
  userId: req.user.id,
  action: 'recommendation_executed',
  details: {
    recommendation: recommendation.action,
    timestamp: new Date(),
    outcome: 'pending'
  }
});
```

## 10. Conclusion

Integrating Ollama into the BleSaf queue management system is highly feasible and offers significant value. The proposed architecture maintains the existing real-time performance while adding an intelligent layer that provides context-aware recommendations, predictive analytics, and decision support. By leveraging open-source LLMs locally, the solution ensures data privacy, cost efficiency, and full control over the AI capabilities. The phased implementation approach allows for gradual rollout and validation, minimizing risk while maximizing impact on branch operational efficiency.
