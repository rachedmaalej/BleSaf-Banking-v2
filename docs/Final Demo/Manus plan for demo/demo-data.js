/**
 * BléSaf Demo Data Module
 * Shared data source for all HTML mockups
 * Scenario: Agence Lac 2, 26 Oct 2024, 14:00-15:00
 * 36 customers, 4 counters, crisis at 14:15, AI intervention at 14:16
 */

const DEMO_DATA = {

  // ─── META ───────────────────────────────────────────────
  meta: {
    date: '26 Octobre 2024',
    branch: 'Agence Lac 2',
    address: 'Les Berges du Lac, Tunis',
    tenant: 'UIB - Union Internationale de Banques',
    scenario: 'Affluence post-déjeuner avec crise à 14:15',
    slaThreshold: 15 // minutes
  },

  // ─── SERVICES ───────────────────────────────────────────
  services: {
    depot:        { label: "Dépôt d'espèces",     color: '#E9041E', icon: 'savings',        shortLabel: 'Dépôt' },
    retrait:      { label: "Retrait d'espèces",    color: '#2563EB', icon: 'payments',       shortLabel: 'Retrait' },
    consultation: { label: 'Consultation',          color: '#7C3AED', icon: 'support_agent',  shortLabel: 'Consult.' },
    releves:      { label: 'Relevés de compte',    color: '#0891B2', icon: 'receipt_long',   shortLabel: 'Relevés' },
    virement:     { label: 'Virement',              color: '#059669', icon: 'swap_horiz',     shortLabel: 'Virement' },
    autres:       { label: 'Autres opérations',     color: '#6B7280', icon: 'more_horiz',     shortLabel: 'Autres' }
  },

  // ─── TELLERS ────────────────────────────────────────────
  tellers: {
    G1: { name: 'Mohamed Sassi',    role: 'Guichetier Senior' },
    G2: { name: 'Leila Hamdi',      role: 'Guichetière' },
    G3: { name: 'Farid Kallel',     role: 'Guichetier' },
    G4: { name: 'Yasmine Mansour',  role: 'Guichetière (Réserve)' }
  },

  // ─── COLORS ─────────────────────────────────────────────
  colors: {
    sgRed: '#E9041E',
    sgBlack: '#1A1A1A',
    sgRose: '#D66874',
    green: '#10B981',
    amber: '#F59E0B',
    red: '#EF4444',
    blue: '#2563EB',
    gray: '#6B7280',
    lightGray: '#F3F4F6'
  },

  // ─── ALL 36 CUSTOMERS ──────────────────────────────────
  customers: [
    { id:1,  name:'Fatma Sassi',       ticket:'C-001', service:'consultation', arrival:'14:00',  serviceStart:'13:57', serviceEnd:'14:07',   waitMin:-3,   teller:'G1', status:'completed' },
    { id:2,  name:'Ahmed Khedher',     ticket:'R-001', service:'retrait',      arrival:'14:00',  serviceStart:'13:58', serviceEnd:'14:03',   waitMin:-2,   teller:'G2', status:'completed' },
    { id:3,  name:'Leila Dridi',       ticket:'D-001', service:'depot',        arrival:'14:00',  serviceStart:'14:03', serviceEnd:'14:13',   waitMin:3,    teller:'G2', status:'completed' },
    { id:4,  name:'Hamza Sassi',       ticket:'D-002', service:'depot',        arrival:'14:01',  serviceStart:'14:07', serviceEnd:'14:14',   waitMin:6.5,  teller:'G1', status:'completed' },
    { id:5,  name:'Leila Hamdi',       ticket:'R-002', service:'releves',      arrival:'14:01',  serviceStart:'14:14', serviceEnd:'14:18',   waitMin:13.2, teller:'G1', status:'completed' },
    { id:6,  name:'Youssef Ayari',     ticket:'C-002', service:'consultation', arrival:'14:01',  serviceStart:'14:14', serviceEnd:'14:28',   waitMin:13,   teller:'G2', status:'completed' },
    { id:7,  name:'Leila Gharbi',      ticket:'D-003', service:'depot',        arrival:'14:02',  serviceStart:'14:16', serviceEnd:'14:24',   waitMin:14,   teller:'G3', status:'completed' },
    { id:8,  name:'Leila Sassi',       ticket:'D-004', service:'depot',        arrival:'14:05',  serviceStart:'14:18', serviceEnd:'14:24',   waitMin:13,   teller:'G1', status:'completed' },
    { id:9,  name:'Mariem Ben Ali',    ticket:'D-005', service:'depot',        arrival:'14:06',  serviceStart:'14:24', serviceEnd:'14:34',   waitMin:17.7, teller:'G1', status:'completed' },
    { id:10, name:'Youssef Khedher',   ticket:'D-006', service:'depot',        arrival:'14:07',  serviceStart:'14:24', serviceEnd:'14:31',   waitMin:17,   teller:'G3', status:'completed' },
    { id:11, name:'Youssef Kallel',    ticket:'A-001', service:'autres',       arrival:'14:08',  serviceStart:'14:28', serviceEnd:'14:39',   waitMin:20.4, teller:'G2', status:'completed' },
    { id:12, name:'Karim Hamdi',       ticket:'R-003', service:'retrait',      arrival:'14:08',  serviceStart:'14:31', serviceEnd:'14:38',   waitMin:23,   teller:'G3', status:'completed' },
    { id:13, name:'Sonia Sassi',       ticket:'R-004', service:'retrait',      arrival:'14:09',  serviceStart:'14:34', serviceEnd:'14:38',   waitMin:25,   teller:'G1', status:'completed' },
    { id:14, name:'Omar Dridi',        ticket:'V-001', service:'virement',     arrival:'14:11',  serviceStart:'14:38', serviceEnd:'14:48',   waitMin:26.9, teller:'G1', status:'completed' },
    { id:15, name:'Ahmed Jebali',      ticket:'C-003', service:'consultation', arrival:'14:12',  serviceStart:'14:38', serviceEnd:'14:50',   waitMin:26.4, teller:'G3', status:'completed' },
    { id:16, name:'Ahmed Dridi',       ticket:'D-007', service:'depot',        arrival:'14:12',  serviceStart:'14:39', serviceEnd:'14:47',   waitMin:26.6, teller:'G2', status:'completed' },
    { id:17, name:'Leila Trabelsi',    ticket:'C-004', service:'consultation', arrival:'14:13',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:18, name:'Rami Khedher',      ticket:'D-008', service:'depot',        arrival:'14:13',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:19, name:'Rami Kallel',       ticket:'R-005', service:'releves',      arrival:'14:13',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:20, name:'Mariem Trabelsi',   ticket:'D-009', service:'depot',        arrival:'14:14',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:21, name:'Rami Khedher',      ticket:'R-006', service:'releves',      arrival:'14:14',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:22, name:'Mohamed Jebali',    ticket:'D-010', service:'depot',        arrival:'14:14',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:23, name:'Youssef Dridi',     ticket:'C-005', service:'consultation', arrival:'14:16',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:24, name:'Rami Kallel',       ticket:'D-011', service:'depot',        arrival:'14:15',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:25, name:'Leila Mejri',       ticket:'D-012', service:'depot',        arrival:'14:15',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:26, name:'Ines Hamdi',        ticket:'R-007', service:'retrait',      arrival:'14:19',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:27, name:'Fatma Mansour',     ticket:'D-013', service:'depot',        arrival:'14:25',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:28, name:'Sonia Hamdi',       ticket:'C-006', service:'consultation', arrival:'14:26',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:29, name:'Rami Khedher',      ticket:'C-007', service:'consultation', arrival:'14:29',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:30, name:'Leila Ayari',       ticket:'D-014', service:'depot',        arrival:'14:32',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:31, name:'Omar Hamdi',        ticket:'D-015', service:'depot',        arrival:'14:37',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:32, name:'Salma Jebali',      ticket:'R-008', service:'retrait',      arrival:'14:39',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:33, name:'Leila Jebali',      ticket:'C-008', service:'consultation', arrival:'14:42',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:34, name:'Karim Trabelsi',    ticket:'R-009', service:'retrait',      arrival:'14:43',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:35, name:'Karim Ben Ali',     ticket:'R-010', service:'retrait',      arrival:'14:44',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' },
    { id:36, name:'Salma Kallel',      ticket:'D-016', service:'depot',        arrival:'14:45',  serviceStart:null,    serviceEnd:null,      waitMin:null, teller:null, status:'waiting' }
  ],

  // ─── 6 SNAPSHOTS ───────────────────────────────────────
  snapshots: [

    // ── SNAPSHOT 0: 14:00 — Demo Start ──
    {
      id: 0,
      label: 'Démarrage de la démo',
      time: '14:00',
      stats: {
        queue: 3, beingServed: 2, totalServed: 0,
        activeCounters: 2, avgWait: 0, sla: 100, velocity: 20
      },
      healthScore: 95,
      healthLabel: 'Excellent',
      counters: [
        { id: 'G1', status: 'busy',   ticket: 'C-001', customer: 'Fatma Sassi',    service: 'consultation', elapsed: 3 },
        { id: 'G2', status: 'busy',   ticket: 'R-001', customer: 'Ahmed Khedher',  service: 'retrait',      elapsed: 2 },
        { id: 'G3', status: 'closed', ticket: null,     customer: null,              service: null,           elapsed: 0 },
        { id: 'G4', status: 'closed', ticket: null,     customer: null,              service: null,           elapsed: 0 }
      ],
      waiting: [
        { pos: 1, ticket: 'D-001', name: 'Leila Dridi',   service: 'depot',   waitMin: 0, slaBreached: false },
        { pos: 2, ticket: 'D-002', name: 'Hamza Sassi',   service: 'depot',   waitMin: 0, slaBreached: false },
        { pos: 3, ticket: 'R-002', name: 'Leila Hamdi',   service: 'releves', waitMin: 0, slaBreached: false }
      ],
      recommendations: [
        { priority: 'info', icon: 'check_circle', text: 'Situation nominale. 2 guichets suffisent pour la charge actuelle.', action: null }
      ],
      announcement: null
    },

    // ── SNAPSHOT 1: 14:10 — Queue Building ──
    {
      id: 1,
      label: 'File en croissance',
      time: '14:10',
      stats: {
        queue: 9, beingServed: 2, totalServed: 2,
        activeCounters: 2, avgWait: 4, sla: 100, velocity: 44
      },
      healthScore: 82,
      healthLabel: 'Attention',
      counters: [
        { id: 'G1', status: 'busy',   ticket: 'D-002', customer: 'Hamza Sassi',   service: 'depot',   elapsed: 3 },
        { id: 'G2', status: 'busy',   ticket: 'D-001', customer: 'Leila Dridi',   service: 'depot',   elapsed: 7 },
        { id: 'G3', status: 'closed', ticket: null,     customer: null,             service: null,      elapsed: 0 },
        { id: 'G4', status: 'closed', ticket: null,     customer: null,             service: null,      elapsed: 0 }
      ],
      waiting: [
        { pos: 1, ticket: 'R-002', name: 'Leila Hamdi',      service: 'releves',      waitMin: 9,  slaBreached: false },
        { pos: 2, ticket: 'C-002', name: 'Youssef Ayari',    service: 'consultation', waitMin: 9,  slaBreached: false },
        { pos: 3, ticket: 'D-003', name: 'Leila Gharbi',     service: 'depot',        waitMin: 8,  slaBreached: false },
        { pos: 4, ticket: 'D-004', name: 'Leila Sassi',      service: 'depot',        waitMin: 5,  slaBreached: false },
        { pos: 5, ticket: 'D-005', name: 'Mariem Ben Ali',   service: 'depot',        waitMin: 4,  slaBreached: false },
        { pos: 6, ticket: 'D-006', name: 'Youssef Khedher',  service: 'depot',        waitMin: 3,  slaBreached: false },
        { pos: 7, ticket: 'A-001', name: 'Youssef Kallel',   service: 'autres',       waitMin: 2,  slaBreached: false },
        { pos: 8, ticket: 'R-003', name: 'Karim Hamdi',      service: 'retrait',      waitMin: 2,  slaBreached: false },
        { pos: 9, ticket: 'R-004', name: 'Sonia Sassi',      service: 'retrait',      waitMin: 1,  slaBreached: false }
      ],
      recommendations: [
        { priority: 'warning', icon: 'trending_up', text: 'Vélocité en hausse (+44/h). Préparer l\'ouverture du Guichet 3.', action: 'prepare_g3' },
        { priority: 'info',    icon: 'analytics',   text: 'Tendance: Afflux inhabituel de clients Dépôt d\'espèces.', action: null }
      ],
      announcement: null
    },

    // ── SNAPSHOT 2: 14:15 — CRITICAL MOMENT ──
    {
      id: 2,
      label: 'Moment critique',
      time: '14:15',
      stats: {
        queue: 19, beingServed: 2, totalServed: 4,
        activeCounters: 2, avgWait: 5, sla: 100, velocity: 84
      },
      healthScore: 48,
      healthLabel: 'Critique',
      counters: [
        { id: 'G1', status: 'busy',   ticket: 'R-002', customer: 'Leila Hamdi',    service: 'releves',      elapsed: 1 },
        { id: 'G2', status: 'busy',   ticket: 'C-002', customer: 'Youssef Ayari',  service: 'consultation', elapsed: 1 },
        { id: 'G3', status: 'closed', ticket: null,     customer: null,              service: null,           elapsed: 0 },
        { id: 'G4', status: 'closed', ticket: null,     customer: null,              service: null,           elapsed: 0 }
      ],
      waiting: [
        { pos: 1,  ticket: 'D-003', name: 'Leila Gharbi',     service: 'depot',        waitMin: 13,  slaBreached: false },
        { pos: 2,  ticket: 'D-004', name: 'Leila Sassi',      service: 'depot',        waitMin: 10,  slaBreached: false },
        { pos: 3,  ticket: 'D-005', name: 'Mariem Ben Ali',   service: 'depot',        waitMin: 9,   slaBreached: false },
        { pos: 4,  ticket: 'D-006', name: 'Youssef Khedher',  service: 'depot',        waitMin: 8,   slaBreached: false },
        { pos: 5,  ticket: 'A-001', name: 'Youssef Kallel',   service: 'autres',       waitMin: 7.5, slaBreached: false },
        { pos: 6,  ticket: 'R-003', name: 'Karim Hamdi',      service: 'retrait',      waitMin: 7,   slaBreached: false },
        { pos: 7,  ticket: 'R-004', name: 'Sonia Sassi',      service: 'retrait',      waitMin: 6,   slaBreached: false },
        { pos: 8,  ticket: 'V-001', name: 'Omar Dridi',       service: 'virement',     waitMin: 4,   slaBreached: false },
        { pos: 9,  ticket: 'C-003', name: 'Ahmed Jebali',     service: 'consultation', waitMin: 3,   slaBreached: false },
        { pos: 10, ticket: 'D-007', name: 'Ahmed Dridi',      service: 'depot',        waitMin: 3,   slaBreached: false },
        { pos: 11, ticket: 'C-004', name: 'Leila Trabelsi',   service: 'consultation', waitMin: 2,   slaBreached: false },
        { pos: 12, ticket: 'D-008', name: 'Rami Khedher',     service: 'depot',        waitMin: 2,   slaBreached: false },
        { pos: 13, ticket: 'R-005', name: 'Rami Kallel',      service: 'releves',      waitMin: 2,   slaBreached: false },
        { pos: 14, ticket: 'D-009', name: 'Mariem Trabelsi',  service: 'depot',        waitMin: 1,   slaBreached: false },
        { pos: 15, ticket: 'R-006', name: 'Rami Khedher',     service: 'releves',      waitMin: 1,   slaBreached: false },
        { pos: 16, ticket: 'D-010', name: 'Mohamed Jebali',   service: 'depot',        waitMin: 1,   slaBreached: false },
        { pos: 17, ticket: 'C-005', name: 'Youssef Dridi',    service: 'consultation', waitMin: 0,   slaBreached: false },
        { pos: 18, ticket: 'D-011', name: 'Rami Kallel',      service: 'depot',        waitMin: 0,   slaBreached: false },
        { pos: 19, ticket: 'D-012', name: 'Leila Mejri',      service: 'depot',        waitMin: 0,   slaBreached: false }
      ],
      recommendations: [
        { priority: 'critical', icon: 'emergency',     text: 'CRITIQUE: Ouvrir Guichet 3 immédiatement ! 19 clients en attente, vélocité +84/h.', action: 'activate_g3' },
        { priority: 'warning',  icon: 'timer_off',     text: 'Risque SLA: 7 clients dépasseront 15 min dans les 5 prochaines minutes.', action: null },
        { priority: 'warning',  icon: 'priority_high', text: 'Service Dépôt surchargé: 10/19 en attente (53%).', action: null }
      ],
      announcement: '⚠️ ALERTE: File d\'attente critique — Ouverture du Guichet 3 recommandée'
    },

    // ── SNAPSHOT 3: 14:30 — After G3 Activation ──
    {
      id: 3,
      label: 'Après activation G3',
      time: '14:30',
      stats: {
        queue: 18, beingServed: 3, totalServed: 8,
        activeCounters: 3, avgWait: 7, sla: 100, velocity: 12
      },
      healthScore: 68,
      healthLabel: 'Stabilisation',
      counters: [
        { id: 'G1', status: 'busy', ticket: 'D-005', customer: 'Mariem Ben Ali',   service: 'depot',  elapsed: 6 },
        { id: 'G2', status: 'busy', ticket: 'A-001', customer: 'Youssef Kallel',   service: 'autres', elapsed: 2 },
        { id: 'G3', status: 'busy', ticket: 'D-006', customer: 'Youssef Khedher',  service: 'depot',  elapsed: 6 },
        { id: 'G4', status: 'closed', ticket: null,   customer: null,                service: null,     elapsed: 0 }
      ],
      waiting: [
        { pos: 1,  ticket: 'R-003', name: 'Karim Hamdi',      service: 'retrait',      waitMin: 22, slaBreached: true },
        { pos: 2,  ticket: 'R-004', name: 'Sonia Sassi',      service: 'retrait',      waitMin: 21, slaBreached: true },
        { pos: 3,  ticket: 'V-001', name: 'Omar Dridi',       service: 'virement',     waitMin: 19, slaBreached: true },
        { pos: 4,  ticket: 'C-003', name: 'Ahmed Jebali',     service: 'consultation', waitMin: 18, slaBreached: true },
        { pos: 5,  ticket: 'D-007', name: 'Ahmed Dridi',      service: 'depot',        waitMin: 18, slaBreached: true },
        { pos: 6,  ticket: 'C-004', name: 'Leila Trabelsi',   service: 'consultation', waitMin: 17, slaBreached: true },
        { pos: 7,  ticket: 'D-008', name: 'Rami Khedher',     service: 'depot',        waitMin: 17, slaBreached: true },
        { pos: 8,  ticket: 'R-005', name: 'Rami Kallel',      service: 'releves',      waitMin: 17, slaBreached: true },
        { pos: 9,  ticket: 'D-009', name: 'Mariem Trabelsi',  service: 'depot',        waitMin: 16, slaBreached: true },
        { pos: 10, ticket: 'R-006', name: 'Rami Khedher',     service: 'releves',      waitMin: 16, slaBreached: true },
        { pos: 11, ticket: 'D-010', name: 'Mohamed Jebali',   service: 'depot',        waitMin: 16, slaBreached: true },
        { pos: 12, ticket: 'C-005', name: 'Youssef Dridi',    service: 'consultation', waitMin: 14, slaBreached: false },
        { pos: 13, ticket: 'D-011', name: 'Rami Kallel',      service: 'depot',        waitMin: 15, slaBreached: true },
        { pos: 14, ticket: 'D-012', name: 'Leila Mejri',      service: 'depot',        waitMin: 15, slaBreached: true },
        { pos: 15, ticket: 'R-007', name: 'Ines Hamdi',       service: 'retrait',      waitMin: 11, slaBreached: false },
        { pos: 16, ticket: 'D-013', name: 'Fatma Mansour',    service: 'depot',        waitMin: 5,  slaBreached: false },
        { pos: 17, ticket: 'C-006', name: 'Sonia Hamdi',      service: 'consultation', waitMin: 4,  slaBreached: false },
        { pos: 18, ticket: 'C-007', name: 'Rami Khedher',     service: 'consultation', waitMin: 1,  slaBreached: false }
      ],
      recommendations: [
        { priority: 'success', icon: 'trending_down', text: 'Stabilisation en cours: G3 actif, vélocité retombée à +12/h.', action: null },
        { priority: 'warning', icon: 'groups',         text: 'Maintenir 3 guichets minimum jusqu\'à résorption complète.', action: null },
        { priority: 'info',    icon: 'schedule',       text: 'Prochaine fenêtre de pause optimale: 15h30.', action: null }
      ],
      announcement: '✅ Guichet 3 activé — Farid Kallel en service'
    },

    // ── SNAPSHOT 4: 14:45 — G2 Break ──
    {
      id: 4,
      label: 'Pause G2',
      time: '14:45',
      stats: {
        queue: 20, beingServed: 3, totalServed: 13,
        activeCounters: 3, avgWait: 12, sla: 61.5, velocity: 8
      },
      healthScore: 55,
      healthLabel: 'Dégradé',
      counters: [
        { id: 'G1', status: 'busy',    ticket: 'V-001', customer: 'Omar Dridi',     service: 'virement',     elapsed: 7 },
        { id: 'G2', status: 'busy',    ticket: 'D-007', customer: 'Ahmed Dridi',    service: 'depot',        elapsed: 6, breakPending: true },
        { id: 'G3', status: 'busy',    ticket: 'C-003', customer: 'Ahmed Jebali',   service: 'consultation', elapsed: 7 },
        { id: 'G4', status: 'closed',  ticket: null,     customer: null,              service: null,           elapsed: 0 }
      ],
      waiting: [
        { pos: 1,  ticket: 'C-004', name: 'Leila Trabelsi',   service: 'consultation', waitMin: 32, slaBreached: true },
        { pos: 2,  ticket: 'D-008', name: 'Rami Khedher',     service: 'depot',        waitMin: 32, slaBreached: true },
        { pos: 3,  ticket: 'R-005', name: 'Rami Kallel',      service: 'releves',      waitMin: 32, slaBreached: true },
        { pos: 4,  ticket: 'D-009', name: 'Mariem Trabelsi',  service: 'depot',        waitMin: 31, slaBreached: true },
        { pos: 5,  ticket: 'R-006', name: 'Rami Khedher',     service: 'releves',      waitMin: 31, slaBreached: true },
        { pos: 6,  ticket: 'D-010', name: 'Mohamed Jebali',   service: 'depot',        waitMin: 31, slaBreached: true },
        { pos: 7,  ticket: 'C-005', name: 'Youssef Dridi',    service: 'consultation', waitMin: 29, slaBreached: true },
        { pos: 8,  ticket: 'D-011', name: 'Rami Kallel',      service: 'depot',        waitMin: 30, slaBreached: true },
        { pos: 9,  ticket: 'D-012', name: 'Leila Mejri',      service: 'depot',        waitMin: 30, slaBreached: true },
        { pos: 10, ticket: 'R-007', name: 'Ines Hamdi',       service: 'retrait',      waitMin: 26, slaBreached: true },
        { pos: 11, ticket: 'D-013', name: 'Fatma Mansour',    service: 'depot',        waitMin: 20, slaBreached: true },
        { pos: 12, ticket: 'C-006', name: 'Sonia Hamdi',      service: 'consultation', waitMin: 19, slaBreached: true },
        { pos: 13, ticket: 'C-007', name: 'Rami Khedher',     service: 'consultation', waitMin: 16, slaBreached: true },
        { pos: 14, ticket: 'D-014', name: 'Leila Ayari',      service: 'depot',        waitMin: 13, slaBreached: false },
        { pos: 15, ticket: 'D-015', name: 'Omar Hamdi',       service: 'depot',        waitMin: 8,  slaBreached: false },
        { pos: 16, ticket: 'R-008', name: 'Salma Jebali',     service: 'retrait',      waitMin: 6,  slaBreached: false },
        { pos: 17, ticket: 'C-008', name: 'Leila Jebali',     service: 'consultation', waitMin: 3,  slaBreached: false },
        { pos: 18, ticket: 'R-009', name: 'Karim Trabelsi',   service: 'retrait',      waitMin: 2,  slaBreached: false },
        { pos: 19, ticket: 'R-010', name: 'Karim Ben Ali',    service: 'retrait',      waitMin: 1,  slaBreached: false },
        { pos: 20, ticket: 'D-016', name: 'Salma Kallel',     service: 'depot',        waitMin: 0,  slaBreached: false }
      ],
      recommendations: [
        { priority: 'warning',  icon: 'coffee',       text: 'Pause G2 en cours. SLA en baisse (61.5%). Surveiller de près.', action: null },
        { priority: 'warning',  icon: 'person_alert',  text: '13 clients dépassent le seuil SLA de 15 minutes.', action: null },
        { priority: 'info',     icon: 'schedule',      text: 'Envisager rappel anticipé de G2 si file ne diminue pas.', action: 'recall_g2' }
      ],
      announcement: '☕ Guichet 2 en pause — Reprise prévue à 15h00'
    },

    // ── SNAPSHOT 5: 15:00 — Demo End ──
    {
      id: 5,
      label: 'Fin de la démo',
      time: '15:00',
      stats: {
        queue: 17, beingServed: 2, totalServed: 16,
        activeCounters: 2, avgWait: 15, sla: 50, velocity: -8
      },
      healthScore: 45,
      healthLabel: 'Critique',
      counters: [
        { id: 'G1', status: 'busy',   ticket: 'C-004', customer: 'Leila Trabelsi', service: 'consultation', elapsed: 1 },
        { id: 'G2', status: 'break',  ticket: null,     customer: null,              service: null,           elapsed: 0 },
        { id: 'G3', status: 'busy',   ticket: 'R-005', customer: 'Rami Kallel',    service: 'releves',      elapsed: 1 },
        { id: 'G4', status: 'closed', ticket: null,     customer: null,              service: null,           elapsed: 0 }
      ],
      waiting: [
        { pos: 1,  ticket: 'D-008', name: 'Rami Khedher',     service: 'depot',        waitMin: 47, slaBreached: true },
        { pos: 2,  ticket: 'D-009', name: 'Mariem Trabelsi',  service: 'depot',        waitMin: 46, slaBreached: true },
        { pos: 3,  ticket: 'R-006', name: 'Rami Khedher',     service: 'releves',      waitMin: 46, slaBreached: true },
        { pos: 4,  ticket: 'D-010', name: 'Mohamed Jebali',   service: 'depot',        waitMin: 46, slaBreached: true },
        { pos: 5,  ticket: 'C-005', name: 'Youssef Dridi',    service: 'consultation', waitMin: 44, slaBreached: true },
        { pos: 6,  ticket: 'D-011', name: 'Rami Kallel',      service: 'depot',        waitMin: 45, slaBreached: true },
        { pos: 7,  ticket: 'D-012', name: 'Leila Mejri',      service: 'depot',        waitMin: 45, slaBreached: true },
        { pos: 8,  ticket: 'R-007', name: 'Ines Hamdi',       service: 'retrait',      waitMin: 41, slaBreached: true },
        { pos: 9,  ticket: 'D-013', name: 'Fatma Mansour',    service: 'depot',        waitMin: 35, slaBreached: true },
        { pos: 10, ticket: 'C-006', name: 'Sonia Hamdi',      service: 'consultation', waitMin: 34, slaBreached: true },
        { pos: 11, ticket: 'C-007', name: 'Rami Khedher',     service: 'consultation', waitMin: 31, slaBreached: true },
        { pos: 12, ticket: 'D-014', name: 'Leila Ayari',      service: 'depot',        waitMin: 28, slaBreached: true },
        { pos: 13, ticket: 'D-015', name: 'Omar Hamdi',       service: 'depot',        waitMin: 23, slaBreached: true },
        { pos: 14, ticket: 'R-008', name: 'Salma Jebali',     service: 'retrait',      waitMin: 21, slaBreached: true },
        { pos: 15, ticket: 'C-008', name: 'Leila Jebali',     service: 'consultation', waitMin: 18, slaBreached: true },
        { pos: 16, ticket: 'R-009', name: 'Karim Trabelsi',   service: 'retrait',      waitMin: 17, slaBreached: true },
        { pos: 17, ticket: 'R-010', name: 'Karim Ben Ali',    service: 'retrait',      waitMin: 16, slaBreached: true }
      ],
      recommendations: [
        { priority: 'critical', icon: 'emergency',    text: 'ALERTE: SLA critique à 50%. Rappeler G2 immédiatement ou activer G4.', action: 'recall_g2' },
        { priority: 'warning',  icon: 'timer_off',    text: '17 clients en attente, temps moyen 35 min. Situation intenable.', action: null },
        { priority: 'warning',  icon: 'add_business', text: 'Activer Guichet 4 (Yasmine Mansour) pour absorption rapide.', action: 'activate_g4' }
      ],
      announcement: '🔴 SLA critique — Action immédiate requise'
    }
  ],

  // ─── FORECAST DATA ─────────────────────────────────────
  forecast: {
    accuracy: 87,
    points: [
      { time: '14:00', predicted: 8,  upper: 9,  lower: 7 },
      { time: '14:15', predicted: 12, upper: 14, lower: 10 },
      { time: '14:30', predicted: 18, upper: 21, lower: 15 },
      { time: '14:45', predicted: 15, upper: 17, lower: 13 },
      { time: '15:00', predicted: 10, upper: 12, lower: 8 },
      { time: '15:15', predicted: 8,  upper: 9,  lower: 7 },
      { time: '15:30', predicted: 6,  upper: 7,  lower: 5 },
      { time: '15:45', predicted: 5,  upper: 6,  lower: 4 },
      { time: '16:00', predicted: 4,  upper: 5,  lower: 3 }
    ],
    annotations: [
      { time: '14:30', text: 'Pic actuel\nMaintenir 3 guichets' },
      { time: '15:00', text: 'Fenêtre de pause optimale' },
      { time: '15:45', text: 'Basse demande\nRetour à 2 guichets' }
    ]
  },

  // ─── SERVICE BREAKDOWN AT 14:15 ────────────────────────
  serviceBreakdown: {
    time: '14:15',
    data: [
      { service: 'depot',        count: 10, avgWait: 4.5,  pct: 53 },
      { service: 'consultation', count: 3,  avgWait: 1.6,  pct: 16 },
      { service: 'retrait',      count: 2,  avgWait: 6.5,  pct: 10 },
      { service: 'releves',      count: 2,  avgWait: 1.3,  pct: 10 },
      { service: 'virement',     count: 1,  avgWait: 3.9,  pct: 5 },
      { service: 'autres',       count: 1,  avgWait: 7.5,  pct: 5 }
    ]
  },

  // ─── KIOSK FLOW DATA ───────────────────────────────────
  kiosk: {
    languages: [
      { code: 'fr', label: 'Français', flag: '🇫🇷' },
      { code: 'ar', label: 'العربية',  flag: '🇹🇳' }
    ],
    services: [
      { id: 'retrait',      label: "Retrait d'espèces",  icon: 'payments',       color: '#2563EB' },
      { id: 'depot',        label: "Dépôt d'espèces",    icon: 'savings',        color: '#E9041E' },
      { id: 'consultation', label: 'Consultation compte', icon: 'support_agent',  color: '#7C3AED' },
      { id: 'releves',      label: 'Relevés de compte',  icon: 'receipt_long',   color: '#0891B2' },
      { id: 'virement',     label: 'Virement',            icon: 'swap_horiz',     color: '#059669' },
      { id: 'autres',       label: 'Autres opérations',   icon: 'more_horiz',     color: '#6B7280' }
    ],
    demoTicket: {
      ticket: 'R-007',
      service: "Retrait d'espèces",
      customer: 'Ines Hamdi',
      position: 12,
      estimatedWait: 14,
      time: '14:19',
      message: 'Vous serez notifié par SMS quand votre tour approche.'
    }
  },

  // ─── HQ NETWORK DATA ──────────────────────────────────
  hq: {
    networkHealth: 68,
    date: '26 Octobre 2024',
    kpis: {
      totalWaiting: 67,
      networkSla: 71.2,
      servedToday: 234,
      activeCounters: 14,
      totalCounters: 22,
      criticalBranches: 2,
      avgWaitNetwork: 12.4
    },
    branches: [
      {
        id: 1, name: 'Agence Sousse Centre',   city: 'Sousse',
        score: 88, status: 'healthy', trend: 'up',
        waiting: 5, served: 62, sla: 94.2, avgWait: 4.8,
        counters: { active: 3, total: 4 },
        noShows: 2, alerts: 0,
        trendData: [82, 85, 84, 88, 86, 89, 88]
      },
      {
        id: 2, name: 'Agence Lac 2',           city: 'Tunis',
        score: 65, status: 'warning', trend: 'down',
        waiting: 17, served: 52, sla: 50.0, avgWait: 15.0,
        counters: { active: 2, total: 4 },
        noShows: 1, alerts: 3,
        trendData: [90, 88, 85, 78, 72, 68, 65]
      },
      {
        id: 3, name: 'Agence Ariana',          city: 'Ariana',
        score: 71, status: 'warning', trend: 'stable',
        waiting: 12, served: 45, sla: 78.5, avgWait: 9.2,
        counters: { active: 3, total: 4 },
        noShows: 3, alerts: 1,
        trendData: [70, 72, 68, 73, 71, 70, 71]
      },
      {
        id: 4, name: 'Agence Menzah',          city: 'Tunis',
        score: 42, status: 'critical', trend: 'down',
        waiting: 24, served: 38, sla: 45.0, avgWait: 22.5,
        counters: { active: 2, total: 5 },
        noShows: 5, alerts: 4,
        trendData: [65, 58, 52, 48, 45, 43, 42]
      },
      {
        id: 5, name: 'Agence Sfax Médina',     city: 'Sfax',
        score: 55, status: 'warning', trend: 'up',
        waiting: 9, served: 37, sla: 62.0, avgWait: 14.1,
        counters: { active: 4, total: 5 },
        noShows: 2, alerts: 2,
        trendData: [45, 48, 50, 52, 51, 54, 55]
      }
    ],
    recommendations: [
      { priority: 'critical', icon: 'emergency',     text: 'Agence Menzah: SLA critique (45%). Ouvrir 2 guichets supplémentaires ou activer le mode urgence.', branch: 'Menzah' },
      { priority: 'warning',  icon: 'swap_horiz',    text: 'Transférer 1 guichetier de Sousse Centre vers Sfax Médina (surplus de capacité à Sousse).', branch: 'Réseau' },
      { priority: 'info',     icon: 'calendar_month', text: 'Tendance: Mardi prochain = fin de mois. Prévoir +30% d\'effectifs sur toutes les agences.', branch: 'Réseau' }
    ]
  },

  // ─── HELPER FUNCTIONS ──────────────────────────────────

  /** Get service config by key */
  getService(key) {
    return this.services[key] || this.services.autres;
  },

  /** Get service color by key */
  getServiceColor(key) {
    return (this.services[key] || this.services.autres).color;
  },

  /** Get teller name by counter ID */
  getTellerName(counterId) {
    return this.tellers[counterId] ? this.tellers[counterId].name : counterId;
  },

  /** Get health score color */
  getHealthColor(score) {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  },

  /** Get health score label */
  getHealthLabel(score) {
    if (score >= 80) return 'Bon';
    if (score >= 60) return 'Attention';
    return 'Critique';
  },

  /** Get status badge color */
  getStatusColor(status) {
    switch (status) {
      case 'healthy':  return '#10B981';
      case 'warning':  return '#F59E0B';
      case 'critical': return '#EF4444';
      default:         return '#6B7280';
    }
  },

  /** Count SLA breaches in a snapshot */
  countSlaBreaches(snapshotId) {
    const snap = this.snapshots[snapshotId];
    return snap ? snap.waiting.filter(w => w.slaBreached).length : 0;
  },

  /** Get priority color */
  getPriorityColor(priority) {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'warning':  return '#F59E0B';
      case 'success':  return '#10B981';
      default:         return '#3B82F6';
    }
  }
};
