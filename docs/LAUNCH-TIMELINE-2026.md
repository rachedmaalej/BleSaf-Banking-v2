# BléSaf Banking - Launch Timeline 2026

## Q1: Foundation & Hardening (Jan - Mar)

### January 2026 - *Production Hardening*
| Week | Milestone |
|------|-----------|
| W1-W2 | Security hardening: CORS, CSRF, rate limiting, input validation audit |
| W2-W3 | Global error handling, structured logging (Winston/Pino) |
| W3-W4 | CI/CD pipeline setup (GitHub Actions), staging environment deployment |

### February 2026 - *Testing & Notifications MVP*
| Week | Milestone |
|------|-----------|
| W1-W2 | E2E test suite (Playwright) for critical flows: kiosk, teller, manager |
| W2-W3 | Twilio SMS integration - ticket confirmation, "your turn" alerts |
| W3-W4 | Notification queue (Bull/Redis), retry logic, delivery tracking |

### March 2026 - *Pilot Preparation*
| Week | Milestone |
|------|-----------|
| W1 | Load testing (100+ concurrent users per branch simulation) |
| W2 | Complete Phase B: quick actions, long-wait alerts, SLA tracking |
| W3 | Legal: privacy policy, terms of service, GDPR data export/deletion |
| W4 | Pilot partner onboarding: training materials, user guides, runbook |

> **Milestone: v1.0-rc1** - Release Candidate ready for pilot

---

## Q2: Pilot Launch & Iteration (Apr - Jun)

### April 2026 - *Pilot Launch (1-2 branches)*
| Week | Milestone |
|------|-----------|
| W1 | Deploy to production cloud (AWS/GCP) with monitoring (Sentry, Datadog) |
| W2 | **Go-live: First pilot branch** (1 partner bank, 1 branch) |
| W3 | On-site support, real-time bug triage, collect teller/manager feedback |
| W4 | Hotfix sprint based on pilot feedback |

> **Milestone: v1.0** - First production deployment

### May 2026 - *Pilot Expansion + WhatsApp*
| Week | Milestone |
|------|-----------|
| W1-W2 | WhatsApp Business API integration (Meta Cloud API) |
| W2-W3 | Expand pilot to 3-5 branches within the same bank |
| W3-W4 | TV display announcement system live, kiosk UX refinements |

### June 2026 - *Analytics & Reporting*
| Week | Milestone |
|------|-----------|
| W1-W2 | Historical trends: weekly/monthly analytics, peak hour heatmap |
| W2-W3 | Report export (PDF/Excel) for branch managers and HQ |
| W3-W4 | Second pilot bank onboarding (2-3 branches) |

> **Milestone: v1.1** - Multi-branch validated, notifications complete

---

## Q3: Scale & Monetize (Jul - Sep)

### July 2026 - *Multi-Tenant Commercial Release*
| Week | Milestone |
|------|-----------|
| W1-W2 | Self-service tenant onboarding (bank signs up, configures branches) |
| W2-W3 | Subscription billing integration (Stripe or local payment gateway) |
| W3-W4 | SLA dashboard, advanced KPIs, teller performance coaching tools |

> **Milestone: v1.5** - Commercial SaaS platform

### August 2026 - *Scaling Infrastructure*
| Week | Milestone |
|------|-----------|
| W1-W2 | Database optimization, connection pooling, Redis caching layer |
| W2-W3 | Auto-scaling configuration, multi-region readiness (Tunisia + Morocco) |
| W3-W4 | Customer mobile app MVP (React Native - ticket tracking + notifications) |

### September 2026 - *Commercial Expansion*
| Week | Milestone |
|------|-----------|
| W1-W2 | Target: **10+ branches live** across 3-4 banks |
| W2-W3 | API webhooks for core banking system integration |
| W3-W4 | Appointment scheduling system (book a slot in advance) |

> **Milestone: v2.0** - Full platform with mobile app

---

## Q4: Growth & Market Expansion (Oct - Dec)

### October 2026 - *Intelligence Layer*
| Week | Milestone |
|------|-----------|
| W1-W2 | AI-powered predictive wait times (ML model from historical data) |
| W2-W3 | Smart staffing recommendations (suggest counter openings based on patterns) |
| W3-W4 | Dynamic priority queue (auto-detect VIP from banking system) |

### November 2026 - *Regional Expansion*
| Week | Milestone |
|------|-----------|
| W1-W2 | Localization: add English, Darija (Moroccan Arabic) |
| W2-W3 | Deploy to Morocco and Algeria markets |
| W3-W4 | Partner integrations: SSO (LDAP/Active Directory for banks) |

### December 2026 - *Year-End Review & v3.0*
| Week | Milestone |
|------|-----------|
| W1-W2 | Customer feedback dashboard, NPS scoring |
| W2-W3 | Advanced analytics: branch benchmarking, regional trends |
| W4 | **Year-end target: 30-50 branches, 5-10 banks** |

> **Milestone: v3.0** - Regional multi-market platform

---

## Key Metrics Targets

| Quarter | Branches Live | Banks | Daily Tickets | Team Size |
|---------|--------------|-------|---------------|-----------|
| Q1 | 0 (staging) | 0 | Testing only | 1-2 devs |
| Q2 | 5-8 | 1-2 | 200-500/day | 2-3 devs |
| Q3 | 10-20 | 3-5 | 1,000-2,000/day | 3-4 devs + 1 ops |
| Q4 | 30-50 | 5-10 | 3,000-5,000/day | 5-6 devs + 2 ops |

---

## Critical Path (Blockers)

These items **must** happen in order - delays cascade:

```
SMS Integration (Feb) → Pilot Launch (Apr) → Commercial Release (Jul) → Scale (Sep)
     ↑                        ↑                       ↑
  Security hardening     Monitoring setup      Billing integration
  + CI/CD pipeline       + load testing        + self-service onboarding
```

---

## Risk Factors

| Risk | Impact | Mitigation |
|------|--------|------------|
| Twilio SMS costs in Tunisia | High per-message cost | Negotiate volume pricing, prefer WhatsApp |
| Bank IT approval process | 2-4 month delays | Start conversations now, prepare security docs |
| Zero test coverage today | Launch delays | Prioritize E2E tests for critical paths only |
| Single developer bottleneck | Slow velocity | Hire backend dev by Q2 |
| Regulatory compliance (banking) | Blocker | Engage legal counsel early (Jan-Feb) |

---

*This timeline assumes 1-2 full-time developers starting now and scaling the team through the year. The most critical immediate action is completing SMS notifications and security hardening in Q1 - everything else depends on getting the pilot live by April.*
