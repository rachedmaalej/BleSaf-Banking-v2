# Quick Start Implementation Guide
## Adding LLM Intelligence to BleSaf Dashboard

**Author:** Manus AI
**Date:** February 8, 2026

## Overview

This guide provides step-by-step instructions to integrate Ollama-powered AI recommendations into your existing BleSaf queue management system. The implementation is designed to be non-invasive, allowing you to add intelligence without disrupting current operations.

**Estimated Implementation Time:** 4-6 hours
**Prerequisites:** Node.js 18+, Docker (optional), Basic TypeScript/JavaScript knowledge

## Phase 1: Environment Setup (30 minutes)

### Step 1: Install Ollama

**Option A: Linux/Mac (Recommended for Production)**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version

# Pull recommended model (4.7GB download)
ollama pull llama3.1:8b

# Test the model
ollama run llama3.1:8b "Hello, respond with OK"
```

**Option B: Docker (Good for Development)**
```bash
# Run Ollama in Docker
docker run -d --name ollama \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  ollama/ollama

# Pull model inside container
docker exec ollama ollama pull llama3.1:8b
```

**Option C: Windows**
```powershell
# Download installer from https://ollama.com/download/windows
# Run installer
# Open PowerShell and verify
ollama --version
ollama pull llama3.1:8b
```

### Step 2: Install Redis (for caching)

**Using Docker:**
```bash
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Using Package Manager:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Mac
brew install redis
brew services start redis

# Verify
redis-cli ping  # Should return "PONG"
```

### Step 3: Update Environment Variables

Add to your `.env` file:
```bash
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=30000  # 30 seconds

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Recommendation Settings
RECOMMENDATION_INTERVAL=120000  # 2 minutes
RECOMMENDATION_CACHE_TTL=120    # 2 minutes
```

## Phase 2: Backend Implementation (2-3 hours)

### Step 1: Install Dependencies

```bash
cd blesaf-backend
npm install ollama ioredis
```

### Step 2: Create Service Files

Create the following directory structure:
```
src/
├── services/
│   ├── llm/
│   │   ├── ollamaService.js
│   │   ├── contextBuilder.js
│   │   ├── promptTemplates.js
│   │   └── recommendationCache.js
│   └── metrics/
│       └── metricsCalculator.js
├── controllers/
│   └── recommendationController.js
└── routes/
    └── recommendations.js
```

### Step 3: Implement Ollama Service

**File: `src/services/llm/ollamaService.js`**
```javascript
import { Ollama } from 'ollama';
import { systemPrompt, buildUserPrompt } from './promptTemplates.js';

class OllamaService {
  constructor() {
    this.client = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT) || 30000;
  }

  /**
   * Generate recommendations based on current branch context
   * @param {Object} context - Branch operational context
   * @returns {Promise<Object>} Recommendations object
   */
  async generateRecommendations(context) {
    try {
      const startTime = Date.now();
      
      const response = await this.client.chat({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildUserPrompt(context) }
        ],
        format: 'json',
        options: {
          temperature: 0.3,  // Lower = more consistent
          top_p: 0.9,
          num_predict: 1000  // Max tokens
        }
      });

      const recommendations = JSON.parse(response.message.content);
      const duration = Date.now() - startTime;

      console.log(`[Ollama] Generated recommendations in ${duration}ms`);

      return {
        ...recommendations,
        metadata: {
          model: this.model,
          generatedAt: new Date().toISOString(),
          responseTime: duration
        }
      };
    } catch (error) {
      console.error('[Ollama] Error generating recommendations:', error);
      throw new Error(`LLM service error: ${error.message}`);
    }
  }

  /**
   * Test connection to Ollama server
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const response = await this.client.chat({
        model: this.model,
        messages: [{ role: 'user', content: 'Respond with OK' }]
      });
      return response.message.content.includes('OK');
    } catch (error) {
      console.error('[Ollama] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get available models
   * @returns {Promise<Array>}
   */
  async listModels() {
    try {
      const response = await this.client.list();
      return response.models;
    } catch (error) {
      console.error('[Ollama] Failed to list models:', error);
      return [];
    }
  }
}

export default new OllamaService();
```

### Step 4: Implement Prompt Templates

**File: `src/services/llm/promptTemplates.js`**
```javascript
export const systemPrompt = `You are an AI assistant specialized in optimizing bank branch queue management operations.

ROLE:
Analyze real-time operational data and provide actionable recommendations to branch managers to optimize customer wait times, resource allocation, and service quality.

CONSTRAINTS:
- Recommendations must be specific, actionable, and implementable within 5 minutes
- Always prioritize SLA compliance (customers must wait <15 minutes)
- Balance customer experience with operational efficiency
- Provide confidence scores (0-100%) based on data quality and certainty
- Explain expected impact in quantifiable terms

OUTPUT FORMAT (JSON only, no additional text):
{
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Brief action description (max 100 chars)",
      "reasoning": "Why this action is recommended (max 200 chars)",
      "impact": {
        "waitTimeReduction": "X minutes" or "N/A",
        "affectedCustomers": <number>,
        "slaImpact": "positive|neutral|negative"
      },
      "confidence": <0-100>,
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

DECISION FRAMEWORK:
1. SLA Risk: If any customer >12 min wait → HIGH priority recommendation
2. Queue Growth: If queue velocity >0 and available counters → MEDIUM priority
3. Resource Optimization: If capacity utilization <60% or >90% → LOW priority
4. Teller Performance: If teller >50% slower than average → MEDIUM priority`;

export function buildUserPrompt(context) {
  const {
    timestamp,
    branch,
    currentState,
    queueComposition,
    tellerPerformance,
    derivedMetrics,
    historicalContext
  } = context;

  return `
CURRENT BRANCH STATUS
Time: ${timestamp}
Branch: ${branch.name} (${branch.id})

QUEUE STATE:
- Total customers waiting: ${currentState.queueLength}
- Average wait time: ${currentState.averageWaitTime} minutes
- SLA compliance: ${currentState.slaCompliance}%
- Active counters: ${currentState.activeCounters}/${branch.maxCounters}
- Available counters: ${currentState.availableCounters}

QUEUE COMPOSITION BY SERVICE:
${queueComposition.map(s => 
  `- ${s.service}: ${s.count} waiting (avg ${s.avgWait} min)`
).join('\n')}

TELLER PERFORMANCE:
${tellerPerformance.map(t => 
  `- Counter ${t.id} (${t.name}): ${t.ticketsPerHour} tickets/hour, status: ${t.status}`
).join('\n')}

KEY METRICS:
- Queue velocity: ${derivedMetrics.queueVelocity > 0 ? '+' : ''}${derivedMetrics.queueVelocity} customers/hour ${derivedMetrics.queueVelocity > 0 ? '(GROWING)' : '(SHRINKING)'}
- Capacity utilization: ${derivedMetrics.capacityUtilization}%
- Customers at SLA risk (>12 min): ${derivedMetrics.slaRiskCount}
- Predicted demand (next hour): ${derivedMetrics.predictedDemand.min}-${derivedMetrics.predictedDemand.max} customers

HISTORICAL CONTEXT:
- Typical queue at this time: ${historicalContext.typicalQueueAtThisTime} customers
- Typical wait time: ${historicalContext.typicalWaitTime} minutes
- Peak hours: ${historicalContext.peakHourStart} - ${historicalContext.peakHourEnd}

TASK:
Analyze this data and provide 1-3 prioritized recommendations. Focus on:
1. Preventing SLA breaches
2. Optimizing counter allocation based on service demand
3. Balancing teller workload
4. Preparing for predicted demand changes

Respond with valid JSON only, no markdown or additional text.
`.trim();
}
```

### Step 5: Implement Context Builder

**File: `src/services/llm/contextBuilder.js`**
```javascript
import db from '../../models/index.js';
import metricsCalculator from '../metrics/metricsCalculator.js';

class ContextBuilder {
  /**
   * Build complete context for LLM from current operational data
   * @param {string} branchId 
   * @returns {Promise<Object>}
   */
  async buildContext(branchId) {
    try {
      const [
        queueData,
        tellerData,
        historicalData,
        branchInfo
      ] = await Promise.all([
        this.getQueueState(branchId),
        this.getTellerPerformance(branchId),
        this.getHistoricalContext(branchId),
        this.getBranchInfo(branchId)
      ]);

      const derivedMetrics = metricsCalculator.calculate(queueData, tellerData);

      return {
        timestamp: new Date().toISOString(),
        branch: branchInfo,
        currentState: queueData.summary,
        queueComposition: queueData.byService,
        tellerPerformance: tellerData,
        derivedMetrics,
        historicalContext: historicalData
      };
    } catch (error) {
      console.error('[ContextBuilder] Error building context:', error);
      throw error;
    }
  }

  async getBranchInfo(branchId) {
    const branch = await db.Branch.findByPk(branchId);
    return {
      id: branch.id,
      name: branch.name,
      maxCounters: branch.maxCounters || 4,
      slaThreshold: branch.slaThreshold || 15
    };
  }

  async getQueueState(branchId) {
    // Get all waiting tickets
    const tickets = await db.Ticket.findAll({
      where: {
        branchId,
        status: 'waiting'
      },
      include: [{ model: db.Service, as: 'service' }],
      order: [['createdAt', 'ASC']]
    });

    // Calculate summary metrics
    const now = Date.now();
    const waitTimes = tickets.map(t => (now - new Date(t.createdAt).getTime()) / 60000);
    const avgWait = waitTimes.length > 0 
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length 
      : 0;
    
    const slaThreshold = 15; // minutes
    const slaCompliant = waitTimes.filter(w => w <= slaThreshold).length;
    const slaCompliance = waitTimes.length > 0 
      ? (slaCompliant / waitTimes.length) * 100 
      : 100;

    // Count active and available counters
    const counters = await db.Counter.findAll({ where: { branchId } });
    const activeCounters = counters.filter(c => c.status === 'active').length;
    const availableCounters = counters.filter(c => c.status === 'idle').length;

    // Group by service
    const byService = this.groupTicketsByService(tickets);

    return {
      summary: {
        queueLength: tickets.length,
        averageWaitTime: Math.round(avgWait * 10) / 10,
        slaCompliance: Math.round(slaCompliance),
        activeCounters,
        availableCounters
      },
      byService,
      tickets
    };
  }

  groupTicketsByService(tickets) {
    const grouped = {};
    
    tickets.forEach(ticket => {
      const serviceName = ticket.service.name;
      if (!grouped[serviceName]) {
        grouped[serviceName] = {
          service: serviceName,
          count: 0,
          totalWait: 0
        };
      }
      grouped[serviceName].count++;
      const waitTime = (Date.now() - new Date(ticket.createdAt).getTime()) / 60000;
      grouped[serviceName].totalWait += waitTime;
    });

    return Object.values(grouped).map(g => ({
      service: g.service,
      count: g.count,
      avgWait: Math.round((g.totalWait / g.count) * 10) / 10
    }));
  }

  async getTellerPerformance(branchId) {
    const counters = await db.Counter.findAll({
      where: {
        branchId,
        status: ['active', 'idle']
      },
      include: [{ model: db.User, as: 'teller' }]
    });

    return Promise.all(counters.map(async (counter) => {
      const ticketsLastHour = await this.getTicketsServedLastHour(counter.id);
      
      return {
        id: counter.id,
        name: counter.teller?.name || 'Unknown',
        ticketsPerHour: ticketsLastHour,
        status: counter.status
      };
    }));
  }

  async getTicketsServedLastHour(counterId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const count = await db.Ticket.count({
      where: {
        counterId,
        status: 'completed',
        completedAt: { [db.Sequelize.Op.gte]: oneHourAgo }
      }
    });

    return count;
  }

  async getHistoricalContext(branchId) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Get typical metrics for this time
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    
    const historicalSnapshots = await db.HourlySnapshot.findAll({
      where: {
        branchId,
        hourOfDay: currentHour,
        dayOfWeek: currentDay,
        snapshotTime: { [db.Sequelize.Op.gte]: fourWeeksAgo }
      }
    });

    const avgQueue = historicalSnapshots.length > 0
      ? historicalSnapshots.reduce((sum, s) => sum + s.queueLength, 0) / historicalSnapshots.length
      : 5;

    const avgWait = historicalSnapshots.length > 0
      ? historicalSnapshots.reduce((sum, s) => sum + s.avgWaitTime, 0) / historicalSnapshots.length
      : 5;

    return {
      typicalQueueAtThisTime: Math.round(avgQueue),
      typicalWaitTime: Math.round(avgWait * 10) / 10,
      peakHourStart: "14:00",
      peakHourEnd: "16:00"
    };
  }
}

export default new ContextBuilder();
```

### Step 6: Implement Metrics Calculator

**File: `src/services/metrics/metricsCalculator.js`**
```javascript
class MetricsCalculator {
  calculate(queueData, tellerData) {
    return {
      queueVelocity: this.calculateQueueVelocity(queueData),
      capacityUtilization: this.calculateCapacityUtilization(queueData, tellerData),
      slaRiskCount: this.calculateSLARisk(queueData),
      predictedDemand: this.predictDemand()
    };
  }

  calculateQueueVelocity(queueData) {
    // Simplified: estimate based on current queue length
    // In production, track actual arrival rate vs service rate
    const { queueLength, activeCounters } = queueData.summary;
    
    // Assume each counter serves ~6 tickets/hour
    const serviceRate = activeCounters * 6;
    
    // Estimate arrival rate (this should come from historical data)
    const estimatedArrivalRate = queueLength > 5 ? 8 : 5;
    
    return estimatedArrivalRate - serviceRate;
  }

  calculateCapacityUtilization(queueData, tellerData) {
    const activeTellers = tellerData.filter(t => t.status === 'active').length;
    const maxCapacity = tellerData.length * 8; // 8 tickets/hour per teller max
    const currentCapacity = tellerData.reduce((sum, t) => sum + t.ticketsPerHour, 0);
    
    return activeTellers > 0 
      ? Math.round((currentCapacity / maxCapacity) * 100) 
      : 0;
  }

  calculateSLARisk(queueData) {
    const slaThreshold = 15; // minutes
    const riskThreshold = slaThreshold * 0.8; // 12 minutes
    
    // Estimate based on average wait time
    const { averageWaitTime, queueLength } = queueData.summary;
    
    if (averageWaitTime < riskThreshold) return 0;
    
    // Rough estimate: assume 30% of queue is at risk if avg wait is high
    return Math.ceil(queueLength * 0.3);
  }

  predictDemand() {
    // Simplified prediction
    // In production, use historical data and time-series forecasting
    const hour = new Date().getHours();
    
    // Peak hours: 10-12, 14-16
    if ((hour >= 10 && hour < 12) || (hour >= 14 && hour < 16)) {
      return { min: 15, max: 20 };
    }
    
    // Moderate hours: 9-10, 12-14, 16-17
    if ((hour >= 9 && hour < 10) || (hour >= 12 && hour < 14) || (hour >= 16 && hour < 17)) {
      return { min: 10, max: 15 };
    }
    
    // Low hours: 8-9, 17-18
    return { min: 5, max: 10 };
  }
}

export default new MetricsCalculator();
```

### Step 7: Implement Recommendation Cache

**File: `src/services/llm/recommendationCache.js`**
```javascript
import Redis from 'ioredis';

class RecommendationCache {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.defaultTTL = parseInt(process.env.RECOMMENDATION_CACHE_TTL) || 120;
    
    this.redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });
  }

  async get(branchId) {
    try {
      const cached = await this.redis.get(`recommendations:${branchId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return null;
    }
  }

  async set(branchId, recommendations, ttlSeconds = this.defaultTTL) {
    try {
      const data = {
        ...recommendations,
        cachedAt: new Date().toISOString()
      };
      await this.redis.setex(
        `recommendations:${branchId}`,
        ttlSeconds,
        JSON.stringify(data)
      );
      return true;
    } catch (error) {
      console.error('[Cache] Set error:', error);
      return false;
    }
  }

  async delete(branchId) {
    try {
      await this.redis.del(`recommendations:${branchId}`);
      return true;
    } catch (error) {
      console.error('[Cache] Delete error:', error);
      return false;
    }
  }

  async healthCheck() {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new RecommendationCache();
```

### Step 8: Create Recommendation Controller

**File: `src/controllers/recommendationController.js`**
```javascript
import ollamaService from '../services/llm/ollamaService.js';
import contextBuilder from '../services/llm/contextBuilder.js';
import recommendationCache from '../services/llm/recommendationCache.js';

export const getRecommendations = async (req, res) => {
  try {
    const { branchId } = req.params;

    // Check cache first
    const cached = await recommendationCache.get(branchId);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // Build context from current data
    const context = await contextBuilder.buildContext(branchId);

    // Generate recommendations
    const recommendations = await ollamaService.generateRecommendations(context);

    // Cache for future requests
    await recommendationCache.set(branchId, recommendations);

    res.json({
      success: true,
      data: recommendations,
      cached: false
    });
  } catch (error) {
    console.error('[RecommendationController] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error.message,
      fallback: {
        recommendations: [],
        alerts: [{
          severity: 'info',
          message: 'AI recommendations temporarily unavailable. Using manual mode.'
        }],
        insights: []
      }
    });
  }
};

export const refreshRecommendations = async (req, res) => {
  try {
    const { branchId } = req.params;

    // Clear cache to force refresh
    await recommendationCache.delete(branchId);

    // Generate fresh recommendations
    const context = await contextBuilder.buildContext(branchId);
    const recommendations = await ollamaService.generateRecommendations(context);

    // Cache new recommendations
    await recommendationCache.set(branchId, recommendations);

    res.json({
      success: true,
      data: recommendations,
      refreshed: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to refresh recommendations'
    });
  }
};

export const healthCheck = async (req, res) => {
  const ollamaHealthy = await ollamaService.healthCheck();
  const cacheHealthy = await recommendationCache.healthCheck();

  res.json({
    success: ollamaHealthy && cacheHealthy,
    services: {
      ollama: ollamaHealthy ? 'healthy' : 'unhealthy',
      cache: cacheHealthy ? 'healthy' : 'unhealthy'
    }
  });
};
```

### Step 9: Add Routes

**File: `src/routes/recommendations.js`**
```javascript
import express from 'express';
import {
  getRecommendations,
  refreshRecommendations,
  healthCheck
} from '../controllers/recommendationController.js';
import { requireAuth, requireManagerRole } from '../middleware/auth.js';

const router = express.Router();

// Get recommendations (cached or fresh)
router.get('/:branchId', requireAuth, requireManagerRole, getRecommendations);

// Force refresh recommendations
router.post('/:branchId/refresh', requireAuth, requireManagerRole, refreshRecommendations);

// Health check endpoint
router.get('/health', healthCheck);

export default router;
```

**Update `src/routes/index.js`:**
```javascript
import recommendationRoutes from './recommendations.js';

// ... existing routes

app.use('/api/recommendations', recommendationRoutes);
```

## Phase 3: Frontend Implementation (1-2 hours)

### Step 1: Create React Hook

**File: `src/hooks/useRecommendations.ts`**
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

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

interface Alert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

interface RecommendationsData {
  recommendations: Recommendation[];
  alerts: Alert[];
  insights: string[];
  metadata: {
    model: string;
    generatedAt: string;
    responseTime: number;
  };
}

export function useRecommendations(branchId: string) {
  return useQuery({
    queryKey: ['recommendations', branchId],
    queryFn: async () => {
      const response = await api.get(`/recommendations/${branchId}`);
      return response.data.data as RecommendationsData;
    },
    refetchInterval: 120000, // 2 minutes
    staleTime: 60000, // 1 minute
    retry: 2
  });
}

export function useRefreshRecommendations(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/recommendations/${branchId}/refresh`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recommendations', branchId]);
    }
  });
}
```

### Step 2: Create Recommendation Panel Component

**File: `src/components/dashboard/RecommendationPanel.tsx`**
```typescript
import React from 'react';
import { useRecommendations } from '../../hooks/useRecommendations';
import { RecommendationCard } from './RecommendationCard';
import { AlertBanner } from './AlertBanner';
import { Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  branchId: string;
}

export function RecommendationPanel({ branchId }: Props) {
  const { data, isLoading, error, refetch } = useRecommendations(branchId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load recommendations</p>
      </div>
    );
  }

  const { recommendations, alerts, insights, metadata } = data!;
  const highPriority = recommendations.filter(r => r.priority === 'high');
  const mediumPriority = recommendations.filter(r => r.priority === 'medium');
  const lowPriority = recommendations.filter(r => r.priority === 'low');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">AI-Powered Recommendations</h2>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, idx) => (
            <AlertBanner key={idx} alert={alert} />
          ))}
        </div>
      )}

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {highPriority.map((rec, idx) => (
          <RecommendationCard key={idx} recommendation={rec} />
        ))}
        {mediumPriority.map((rec, idx) => (
          <RecommendationCard key={idx} recommendation={rec} />
        ))}
        {lowPriority.map((rec, idx) => (
          <RecommendationCard key={idx} recommendation={rec} />
        ))}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-900 mb-2">Key Insights</h3>
          <ul className="space-y-1">
            {insights.map((insight, idx) => (
              <li key={idx} className="text-sm text-blue-800">• {insight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
        <div className="flex items-center gap-2">
          <span>Powered by {metadata.model}</span>
        </div>
        <div>
          Generated {new Date(metadata.generatedAt).toLocaleTimeString()} 
          ({metadata.responseTime}ms)
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Add to Dashboard

**File: `src/pages/BranchManagerDashboard.tsx`**
```typescript
import { RecommendationPanel } from '../components/dashboard/RecommendationPanel';

export function BranchManagerDashboard() {
  const { branchId } = useAuth();

  return (
    <div className="p-6">
      {/* Existing hero metrics */}
      <HeroMetrics branchId={branchId} />

      {/* Existing operational context */}
      <OperationalContext branchId={branchId} />

      {/* NEW: AI Recommendations */}
      <RecommendationPanel branchId={branchId} />

      {/* Existing queue list and counters */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        <QueueList branchId={branchId} />
        <CounterManagement branchId={branchId} />
      </div>
    </div>
  );
}
```

## Phase 4: Testing & Validation (1 hour)

### Step 1: Test Ollama Connection

```bash
# Test Ollama is running
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Respond with OK",
  "stream": false
}'

# Should return JSON with "OK" in response
```

### Step 2: Test Backend Endpoints

```bash
# Health check
curl http://localhost:3000/api/recommendations/health

# Get recommendations (replace with valid branch ID and auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/recommendations/LAC2
```

### Step 3: Monitor Performance

```javascript
// Add logging to track performance
console.log('[Recommendations] Generation time:', metadata.responseTime, 'ms');

// Acceptable ranges:
// - < 2000ms: Excellent
// - 2000-5000ms: Good
// - > 5000ms: Consider optimization
```

## Troubleshooting

### Issue: Ollama not responding
```bash
# Check if Ollama is running
ps aux | grep ollama

# Restart Ollama
sudo systemctl restart ollama

# Check logs
journalctl -u ollama -f
```

### Issue: Out of memory
```bash
# Check available RAM
free -h

# Consider using smaller model
ollama pull llama3.1:7b  # Instead of 8b
```

### Issue: Slow response times
- Reduce `num_predict` in Ollama options
- Increase cache TTL to reduce LLM calls
- Consider GPU acceleration

## Next Steps

1. **Monitor & Iterate:** Track recommendation acceptance rate and adjust prompts
2. **Collect Feedback:** Ask managers which recommendations are most useful
3. **Expand Features:** Add predictive demand forecasting with historical data
4. **Scale:** Deploy to additional branches once validated

## Support

For issues or questions:
- Check Ollama docs: https://docs.ollama.com
- Review logs in `/var/log/ollama/` or Docker logs
- Test with simpler prompts to isolate issues
