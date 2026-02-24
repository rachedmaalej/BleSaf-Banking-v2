import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================
// DEMO SEED — 5 Agences avec donnees variees
// Usage: npx tsx apps/api/prisma/seed-demo.ts
// ============================================================

const SERVICE_DEFS = [
  {
    prefix: 'A',
    nameFr: 'Retrait / Dépôt',
    nameAr: 'سحب / إيداع',
    icon: 'local_atm',
    priorityWeight: 1,
    avgTime: 5,
    descriptionFr: 'Opérations de caisse courantes',
    descriptionAr: 'عمليات الصندوق الجارية',
    subServicesFr: ["Retrait d'espèces", "Dépôt d'espèces"],
    subServicesAr: ['سحب نقدي', 'إيداع نقدي'],
    displayOrder: 0,
  },
  {
    prefix: 'B',
    nameFr: 'Virements',
    nameAr: 'تحويلات',
    icon: 'swap_horiz',
    priorityWeight: 1,
    avgTime: 8,
    descriptionFr: 'Émission et suivi de virements',
    descriptionAr: 'إصدار ومتابعة التحويلات',
    subServicesFr: ['Émission de virement'],
    subServicesAr: ['تحويل بنكي'],
    displayOrder: 1,
  },
  {
    prefix: 'C',
    nameFr: 'Cartes & Documents',
    nameAr: 'بطاقات ووثائق',
    icon: 'credit_card',
    priorityWeight: 1,
    avgTime: 10,
    descriptionFr: 'Cartes bancaires, chéquiers et relevés',
    descriptionAr: 'بطاقات بنكية وشيكات وكشوفات',
    subServicesFr: ['Retrait de carte bancaire', 'Réinitialisation code carte', 'Relevé de compte', 'Retrait de chéquier'],
    subServicesAr: ['استلام بطاقة بنكية', 'إعادة تعيين رمز البطاقة', 'كشف حساب', 'استلام دفتر شيكات'],
    displayOrder: 2,
  },
  {
    prefix: 'D',
    nameFr: 'Autres services',
    nameAr: 'خدمات أخرى',
    icon: 'more_horiz',
    priorityWeight: 1,
    avgTime: 7,
    descriptionFr: 'Renseignements et mises à jour',
    descriptionAr: 'استفسارات وتحديثات',
    subServicesFr: ['Renseignements divers', 'Mise à jour de données'],
    subServicesAr: ['استفسارات متنوعة', 'تحديث البيانات'],
    displayOrder: 3,
  },
];

interface BranchConfig {
  code: string;
  name: string;
  address: string;
  region: string;
  counterCount: number;
  openCounters: number;
  breakCounters: number; // how many are on break
  manager: { name: string; email: string };
  tellers: { name: string; email: string }[];
  // Performance profile
  completedToday: number;
  waitingNow: number;
  noShows: number;
  avgWaitMins: number;
  slaPercent: number;
  healthScore: number;
  // For hourly/daily historical data
  dailyAvgServed: number;
  dailyAvgWait: number;
  dailySlaAvg: number;
}

const BRANCHES: BranchConfig[] = [
  {
    code: 'LAC2',
    name: 'Agence Lac 2',
    address: '15 Rue du Lac Turkana, Les Berges du Lac 2, Tunis',
    region: 'Tunis',
    counterCount: 3,
    openCounters: 3,
    breakCounters: 0,
    manager: { name: 'Fatma Trabelsi', email: 'manager@demo-bank.tn' },
    tellers: [
      { name: 'Mohamed Sassi', email: 'teller1@demo-bank.tn' },
      { name: 'Leila Hamdi', email: 'teller2@demo-bank.tn' },
      { name: 'Ali Rezgui', email: 'teller3@demo-bank.tn' },
    ],
    completedToday: 28,
    waitingNow: 5,
    noShows: 1,
    avgWaitMins: 7,
    slaPercent: 88,
    healthScore: 85,
    dailyAvgServed: 95,
    dailyAvgWait: 8,
    dailySlaAvg: 89,
  },
  {
    code: 'MNZ6',
    name: 'Agence Menzah 6',
    address: '22 Avenue Habib Bourguiba, El Menzah 6, Tunis',
    region: 'Tunis',
    counterCount: 4,
    openCounters: 2,
    breakCounters: 1,
    manager: { name: 'Sami Belhaj', email: 'manager.mnz6@demo-bank.tn' },
    tellers: [
      { name: 'Amine Khemiri', email: 'teller1.mnz6@demo-bank.tn' },
      { name: 'Salwa Ferchichi', email: 'teller2.mnz6@demo-bank.tn' },
      { name: 'Oussama Jlassi', email: 'teller3.mnz6@demo-bank.tn' },
    ],
    completedToday: 14,
    waitingNow: 18,
    noShows: 5,
    avgWaitMins: 24,
    slaPercent: 61,
    healthScore: 42,
    dailyAvgServed: 65,
    dailyAvgWait: 19,
    dailySlaAvg: 64,
  },
  {
    code: 'ARIA',
    name: 'Agence Ariana',
    address: '8 Rue de la Liberté, Ariana Ville, Ariana',
    region: 'Tunis',
    counterCount: 3,
    openCounters: 2,
    breakCounters: 0,
    manager: { name: 'Henda Maaroufi', email: 'manager.aria@demo-bank.tn' },
    tellers: [
      { name: 'Yassine Ben Fredj', email: 'teller1.aria@demo-bank.tn' },
      { name: 'Mariem Zaghdoudi', email: 'teller2.aria@demo-bank.tn' },
    ],
    completedToday: 22,
    waitingNow: 8,
    noShows: 2,
    avgWaitMins: 12,
    slaPercent: 78,
    healthScore: 71,
    dailyAvgServed: 82,
    dailyAvgWait: 11,
    dailySlaAvg: 80,
  },
  {
    code: 'SOUS',
    name: 'Agence Sousse Centre',
    address: '45 Avenue Mohamed V, Centre Ville, Sousse',
    region: 'Sousse',
    counterCount: 4,
    openCounters: 3,
    breakCounters: 0,
    manager: { name: 'Nabil Ghedira', email: 'manager.sous@demo-bank.tn' },
    tellers: [
      { name: 'Hatem Bouzidi', email: 'teller1.sous@demo-bank.tn' },
      { name: 'Rim Chaabani', email: 'teller2.sous@demo-bank.tn' },
      { name: 'Sofiane Mejri', email: 'teller3.sous@demo-bank.tn' },
    ],
    completedToday: 34,
    waitingNow: 3,
    noShows: 0,
    avgWaitMins: 5,
    slaPercent: 95,
    healthScore: 88,
    dailyAvgServed: 105,
    dailyAvgWait: 6,
    dailySlaAvg: 93,
  },
  {
    code: 'SFAX',
    name: 'Agence Sfax Médina',
    address: '12 Rue Ali Belhouane, Médina, Sfax',
    region: 'Sfax',
    counterCount: 3,
    openCounters: 2,
    breakCounters: 0,
    manager: { name: 'Lotfi Karray', email: 'manager.sfax@demo-bank.tn' },
    tellers: [
      { name: 'Ezzeddine Masmoudi', email: 'teller1.sfax@demo-bank.tn' },
      { name: 'Faten Trigui', email: 'teller2.sfax@demo-bank.tn' },
    ],
    completedToday: 18,
    waitingNow: 12,
    noShows: 3,
    avgWaitMins: 16,
    slaPercent: 68,
    healthScore: 55,
    dailyAvgServed: 72,
    dailyAvgWait: 14,
    dailySlaAvg: 71,
  },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600000);
}

function minsAgo(mins: number): Date {
  return new Date(Date.now() - mins * 60000);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🏦 Seeding DEMO data — 5 agences...\n');

  // ── Tenant ──
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo-bank' },
    update: { name: 'UIB - Union Internationale de Banques' },
    create: {
      name: 'UIB - Union Internationale de Banques',
      subdomain: 'demo-bank',
      logoUrl: null,
      primaryColor: '#E9041E',
      languageConfig: { default: 'fr', available: ['fr', 'ar'] },
      status: 'active',
    },
  });
  console.log(`✅ Tenant: ${tenant.name}`);

  const passwordHash = await bcrypt.hash('demo123', 12);

  // ── Global admins ──
  await prisma.user.upsert({
    where: { email: 'admin@blesaf.app' },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: null,
      name: 'Super Admin',
      email: 'admin@blesaf.app',
      passwordHash,
      role: 'super_admin',
      status: 'active',
    },
  });

  await prisma.user.upsert({
    where: { email: 'bank.admin@demo-bank.tn' },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: null,
      name: 'Ahmed Ben Ali',
      email: 'bank.admin@demo-bank.tn',
      passwordHash,
      role: 'bank_admin',
      status: 'active',
    },
  });
  console.log('✅ Global admins created');

  // ── Create each branch ──
  for (const cfg of BRANCHES) {
    console.log(`\n── ${cfg.name} (${cfg.code}) ──`);

    // Branch
    const branch = await prisma.branch.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: cfg.code } },
      update: { name: cfg.name, address: cfg.address, region: cfg.region },
      create: {
        tenantId: tenant.id,
        name: cfg.name,
        code: cfg.code,
        address: cfg.address,
        region: cfg.region,
        timezone: 'Africa/Tunis',
        notifyAtPosition: 2,
        status: 'active',
        autoQueueEnabled: true,
        queueStatus: 'open',
      },
    });

    // Services
    // Delete tickets on obsolete service prefixes before removing them (FK constraint)
    const obsoleteServices = await prisma.serviceCategory.findMany({
      where: { branchId: branch.id, prefix: { notIn: SERVICE_DEFS.map((s) => s.prefix) } },
      select: { id: true },
    });
    if (obsoleteServices.length > 0) {
      const ids = obsoleteServices.map((s) => s.id);
      await prisma.ticket.deleteMany({ where: { serviceCategoryId: { in: ids } } });
      await prisma.serviceCategory.deleteMany({ where: { id: { in: ids } } });
    }

    const services = await Promise.all(
      SERVICE_DEFS.map((s) =>
        prisma.serviceCategory.upsert({
          where: { branchId_prefix: { branchId: branch.id, prefix: s.prefix } },
          update: {
            nameFr: s.nameFr,
            nameAr: s.nameAr,
            icon: s.icon,
            priorityWeight: s.priorityWeight,
            avgServiceTime: s.avgTime,
            descriptionFr: s.descriptionFr,
            descriptionAr: s.descriptionAr,
            subServicesFr: s.subServicesFr,
            subServicesAr: s.subServicesAr,
            displayOrder: s.displayOrder,
            showOnKiosk: true,
            isActive: true,
          },
          create: {
            branchId: branch.id,
            prefix: s.prefix,
            nameFr: s.nameFr,
            nameAr: s.nameAr,
            icon: s.icon,
            priorityWeight: s.priorityWeight,
            avgServiceTime: s.avgTime,
            descriptionFr: s.descriptionFr,
            descriptionAr: s.descriptionAr,
            subServicesFr: s.subServicesFr,
            subServicesAr: s.subServicesAr,
            displayOrder: s.displayOrder,
            showOnKiosk: true,
            isActive: true,
          },
        }),
      ),
    );

    // Manager
    const manager = await prisma.user.upsert({
      where: { email: cfg.manager.email },
      update: { branchId: branch.id },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: cfg.manager.name,
        email: cfg.manager.email,
        passwordHash,
        role: 'branch_manager',
        status: 'active',
      },
    });

    // Tellers
    const tellers = await Promise.all(
      cfg.tellers.map((t) =>
        prisma.user.upsert({
          where: { email: t.email },
          update: { branchId: branch.id },
          create: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: t.name,
            email: t.email,
            passwordHash,
            role: 'teller',
            status: 'active',
          },
        }),
      ),
    );

    // Counters
    const counters = [];
    for (let i = 1; i <= cfg.counterCount; i++) {
      const tellerIdx = i - 1;
      const hasTeller = tellerIdx < tellers.length;
      let status: 'open' | 'closed' | 'on_break' = 'closed';
      if (i <= cfg.openCounters) status = 'open';
      if (i > cfg.openCounters && i <= cfg.openCounters + cfg.breakCounters) status = 'on_break';

      const counter = await prisma.counter.upsert({
        where: { branchId_number: { branchId: branch.id, number: i } },
        update: { status, assignedUserId: hasTeller ? tellers[tellerIdx].id : null },
        create: {
          branchId: branch.id,
          number: i,
          label: i === 1 ? 'Guichet Rapide' : null,
          status,
          assignedUserId: hasTeller ? tellers[tellerIdx].id : null,
        },
      });
      counters.push(counter);
    }

    // Counter-Service assignments
    for (const counter of counters) {
      await prisma.counterService.deleteMany({ where: { counterId: counter.id } });
      // All counters handle all services for simplicity
      await prisma.counterService.createMany({
        data: services.map((s) => ({ counterId: counter.id, serviceId: s.id })),
        skipDuplicates: true,
      });
    }

    // ── Completed tickets (historical, today) ──
    const now = new Date();
    const serviceWeights = [40, 25, 20, 15]; // % for A, B, C, D
    const statuses: ('completed' | 'no_show')[] = [];

    // Build status distribution
    for (let i = 0; i < cfg.completedToday; i++) statuses.push('completed');
    for (let i = 0; i < cfg.noShows; i++) statuses.push('no_show');

    // Delete today's tickets for this branch to avoid duplicates
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    await prisma.ticket.deleteMany({
      where: { branchId: branch.id, createdAt: { gte: todayStart } },
    });

    // Create completed + no-show tickets
    const ticketCounters: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (let i = 0; i < statuses.length; i++) {
      // Pick service based on weights
      const rand = Math.random() * 100;
      let cumulative = 0;
      let svcIdx = 0;
      for (let j = 0; j < serviceWeights.length; j++) {
        cumulative += serviceWeights[j];
        if (rand < cumulative) { svcIdx = j; break; }
      }
      const svc = services[svcIdx];
      ticketCounters[svc.prefix]++;
      const ticketNum = `${svc.prefix}-${String(ticketCounters[svc.prefix]).padStart(3, '0')}`;
      const createdMinsAgo = randomBetween(30, 180);
      const waitMins = randomBetween(3, cfg.avgWaitMins + 5);
      const serviceMins = randomBetween(3, svc.avgServiceTime);
      const counterIdx = i % Math.min(counters.length, cfg.openCounters);
      const tellerIdx2 = counterIdx < tellers.length ? counterIdx : 0;

      const createdAt = minsAgo(createdMinsAgo);
      const calledAt = minsAgo(createdMinsAgo - waitMins);
      const servingAt = minsAgo(createdMinsAgo - waitMins - 1);
      const completedAt = minsAgo(createdMinsAgo - waitMins - 1 - serviceMins);

      await prisma.ticket.create({
        data: {
          branchId: branch.id,
          serviceCategoryId: svc.id,
          ticketNumber: ticketNum,
          status: statuses[i],
          priority: 'normal',
          customerPhone: `+216${randomBetween(20, 99)}${randomBetween(100, 999)}${randomBetween(100, 999)}`,
          notificationChannel: Math.random() > 0.3 ? 'sms' : 'whatsapp',
          checkinMethod: Math.random() > 0.2 ? 'kiosk' : 'mobile',
          counterId: counters[counterIdx].id,
          servedByUserId: tellers[tellerIdx2].id,
          calledAt,
          servingStartedAt: servingAt,
          completedAt: statuses[i] === 'completed' ? completedAt : null,
          createdAt,
        },
      });
    }

    // ── Waiting tickets (current queue) ──
    for (let i = 0; i < cfg.waitingNow; i++) {
      const svcIdx = i % services.length;
      const svc = services[svcIdx];
      ticketCounters[svc.prefix]++;
      const ticketNum = `${svc.prefix}-${String(ticketCounters[svc.prefix]).padStart(3, '0')}`;
      const isVip = i === 0 && cfg.code === 'LAC2'; // One VIP at Lac 2

      await prisma.ticket.create({
        data: {
          branchId: branch.id,
          serviceCategoryId: svc.id,
          ticketNumber: ticketNum,
          status: 'waiting',
          priority: isVip ? 'vip' : 'normal',
          customerPhone: `+216${randomBetween(20, 99)}${randomBetween(100, 999)}${randomBetween(100, 999)}`,
          notificationChannel: Math.random() > 0.3 ? 'sms' : 'none',
          checkinMethod: 'kiosk',
          createdAt: minsAgo(randomBetween(1, cfg.avgWaitMins + 5)),
        },
      });
    }

    // ── Currently serving tickets ──
    const openCountersList = counters.filter((c) => c.status === 'open');
    for (let i = 0; i < Math.min(openCountersList.length, tellers.length); i++) {
      const svc = services[i % services.length];
      ticketCounters[svc.prefix]++;
      const ticketNum = `${svc.prefix}-${String(ticketCounters[svc.prefix]).padStart(3, '0')}`;
      const serviceMins = randomBetween(1, 5);

      const ticket = await prisma.ticket.create({
        data: {
          branchId: branch.id,
          serviceCategoryId: svc.id,
          ticketNumber: ticketNum,
          status: 'serving',
          priority: 'normal',
          customerPhone: `+216${randomBetween(20, 99)}${randomBetween(100, 999)}${randomBetween(100, 999)}`,
          notificationChannel: 'sms',
          checkinMethod: 'kiosk',
          counterId: openCountersList[i].id,
          servedByUserId: i < tellers.length ? tellers[i].id : null,
          calledAt: minsAgo(serviceMins + 1),
          servingStartedAt: minsAgo(serviceMins),
          createdAt: minsAgo(serviceMins + randomBetween(5, 15)),
        },
      });

      await prisma.counter.update({
        where: { id: openCountersList[i].id },
        data: { currentTicketId: ticket.id },
      });
    }

    // ── Break for on_break counters ──
    const breakCountersList = counters.filter((c) => c.status === 'on_break');
    for (const bc of breakCountersList) {
      const tellerForBreak = tellers.find((t) => t.id === bc.assignedUserId);
      if (!tellerForBreak) continue;

      const breakRecord = await prisma.tellerBreak.create({
        data: {
          branchId: branch.id,
          counterId: bc.id,
          userId: tellerForBreak.id,
          reason: 'prayer',
          durationMins: 15,
          startedAt: minsAgo(8),
          expectedEnd: new Date(Date.now() + 7 * 60000),
          startedById: manager.id,
        },
      });

      await prisma.counter.update({
        where: { id: bc.id },
        data: { activeBreakId: breakRecord.id },
      });
    }

    // ── Daily targets ──
    await prisma.branchTarget.upsert({
      where: { branchId_date: { branchId: branch.id, date: todayStart } },
      update: {},
      create: {
        branchId: branch.id,
        date: todayStart,
        servedTarget: 120,
        avgWaitTarget: 10,
        slaTarget: 90,
        slaThreshold: 15,
      },
    });

    // ── 7 days of DailyBranchStats ──
    for (let d = 1; d <= 7; d++) {
      const date = daysAgo(d);
      const variation = (Math.random() - 0.5) * 0.2; // +/- 10%
      await prisma.dailyBranchStats.upsert({
        where: { branchId_date: { branchId: branch.id, date } },
        update: {},
        create: {
          branchId: branch.id,
          date,
          totalTickets: Math.round(cfg.dailyAvgServed * (1 + variation) * 1.15),
          completedTickets: Math.round(cfg.dailyAvgServed * (1 + variation)),
          noShows: randomBetween(0, 5),
          avgWaitTimeMins: Math.round(cfg.dailyAvgWait * (1 + variation)),
          avgServiceTimeMins: randomBetween(8, 15),
          peakHour: randomBetween(10, 12),
        },
      });
    }

    // ── 7 days x 10 hours of HourlySnapshots ──
    for (let d = 0; d <= 6; d++) {
      for (let h = 8; h <= 17; h++) {
        const ts = daysAgo(d);
        ts.setHours(h, 0, 0, 0);
        // Simulate realistic hourly pattern: peak 10-12, secondary peak 14-16
        let loadFactor = 0.5;
        if (h >= 10 && h <= 12) loadFactor = 1.0;
        else if (h >= 14 && h <= 16) loadFactor = 0.8;
        else if (h === 8 || h === 17) loadFactor = 0.3;

        const baseQueue = (cfg.waitingNow / 2) * loadFactor;
        const variation2 = (Math.random() - 0.5) * 0.4;

        await prisma.hourlySnapshot.create({
          data: {
            branchId: branch.id,
            timestamp: ts,
            hour: h,
            queueLength: Math.max(0, Math.round(baseQueue * (1 + variation2))),
            activeCounters: Math.min(cfg.counterCount, Math.max(1, cfg.openCounters + (h >= 10 && h <= 12 ? 1 : 0))),
            avgWaitTimeMins: Math.max(1, Math.round(cfg.avgWaitMins * loadFactor * (1 + variation2))),
          },
        });
      }
    }

    console.log(
      `   ✅ ${cfg.completedToday} completed, ${cfg.waitingNow} waiting, ${cfg.noShows} no-shows, ${counters.length} counters`,
    );
  }

  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEMO SEED COMPLETE — 5 agences chargees !');
  console.log('='.repeat(60));
  console.log('\n📋 Identifiants de connexion (mot de passe: demo123)\n');
  console.log('  Super Admin:      admin@blesaf.app');
  console.log('  Bank Admin:       bank.admin@demo-bank.tn');
  console.log('');
  for (const cfg of BRANCHES) {
    console.log(`  ── ${cfg.name} ──`);
    console.log(`  BM:    ${cfg.manager.email}`);
    cfg.tellers.forEach((t, i) => console.log(`  G${i + 1}:    ${t.email}`));
    console.log('');
  }
  console.log('\n📊 Performance des agences:');
  console.log('  Agence Lac 2:       Score 85 (Excellent)');
  console.log('  Agence Menzah 6:    Score 42 (Critique)');
  console.log('  Agence Ariana:      Score 71 (Bon)');
  console.log('  Agence Sousse:      Score 88 (Excellent)');
  console.log('  Agence Sfax:        Score 55 (Attention)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
