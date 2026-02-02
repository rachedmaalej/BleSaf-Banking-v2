import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a demo tenant (bank)
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo-bank' },
    update: {},
    create: {
      name: 'Demo Bank Tunisia',
      subdomain: 'demo-bank',
      logoUrl: null,
      primaryColor: '#1e40af',
      languageConfig: { default: 'fr', available: ['fr', 'ar'] },
      status: 'active',
    },
  });

  console.log(`Created tenant: ${tenant.name} (${tenant.id})`);

  // Create a branch
  const branch = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'LAC2' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Agence Lac 2',
      code: 'LAC2',
      address: '15 Rue du Lac Turkana, Les Berges du Lac 2, Tunis',
      region: 'Tunis',
      timezone: 'Africa/Tunis',
      notifyAtPosition: 2,
      status: 'active',
    },
  });

  console.log(`Created branch: ${branch.name} (${branch.id})`);

  // Create service categories
  const services = await Promise.all([
    prisma.serviceCategory.upsert({
      where: { branchId_prefix: { branchId: branch.id, prefix: 'A' } },
      update: {},
      create: {
        branchId: branch.id,
        nameAr: 'سحب نقدي',
        nameFr: 'Retrait',
        prefix: 'A',
        icon: '💵',
        priorityWeight: 1,
        avgServiceTime: 5,
        isActive: true,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { branchId_prefix: { branchId: branch.id, prefix: 'B' } },
      update: {},
      create: {
        branchId: branch.id,
        nameAr: 'إيداع',
        nameFr: 'Dépôt',
        prefix: 'B',
        icon: '📥',
        priorityWeight: 1,
        avgServiceTime: 7,
        isActive: true,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { branchId_prefix: { branchId: branch.id, prefix: 'C' } },
      update: {},
      create: {
        branchId: branch.id,
        nameAr: 'فتح حساب',
        nameFr: 'Ouverture de compte',
        prefix: 'C',
        icon: '📋',
        priorityWeight: 2,
        avgServiceTime: 20,
        isActive: true,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { branchId_prefix: { branchId: branch.id, prefix: 'D' } },
      update: {},
      create: {
        branchId: branch.id,
        nameAr: 'قروض',
        nameFr: 'Prêts',
        prefix: 'D',
        icon: '🏦',
        priorityWeight: 3,
        avgServiceTime: 30,
        isActive: true,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { branchId_prefix: { branchId: branch.id, prefix: 'E' } },
      update: {},
      create: {
        branchId: branch.id,
        nameAr: 'صرف العملات',
        nameFr: 'Change',
        prefix: 'E',
        icon: '💱',
        priorityWeight: 1,
        avgServiceTime: 10,
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${services.length} service categories`);

  // Create users with hashed passwords
  const passwordHash = await bcrypt.hash('demo123', 12);

  const users = await Promise.all([
    // Super admin
    prisma.user.upsert({
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
    }),
    // Bank admin
    prisma.user.upsert({
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
    }),
    // Branch manager
    prisma.user.upsert({
      where: { email: 'manager@demo-bank.tn' },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'Fatma Trabelsi',
        email: 'manager@demo-bank.tn',
        passwordHash,
        role: 'branch_manager',
        status: 'active',
      },
    }),
    // Teller 1
    prisma.user.upsert({
      where: { email: 'teller1@demo-bank.tn' },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'Mohamed Sassi',
        email: 'teller1@demo-bank.tn',
        passwordHash,
        role: 'teller',
        status: 'active',
      },
    }),
    // Teller 2
    prisma.user.upsert({
      where: { email: 'teller2@demo-bank.tn' },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: 'Leila Hamdi',
        email: 'teller2@demo-bank.tn',
        passwordHash,
        role: 'teller',
        status: 'active',
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Get tellers for counter assignment
  const teller1 = users.find((u) => u.email === 'teller1@demo-bank.tn')!;
  const teller2 = users.find((u) => u.email === 'teller2@demo-bank.tn')!;

  // Create counters
  const counters = await Promise.all([
    prisma.counter.upsert({
      where: { branchId_number: { branchId: branch.id, number: 1 } },
      update: {},
      create: {
        branchId: branch.id,
        number: 1,
        label: 'Guichet Rapide',
        status: 'open',
        assignedUserId: teller1.id,
      },
    }),
    prisma.counter.upsert({
      where: { branchId_number: { branchId: branch.id, number: 2 } },
      update: {},
      create: {
        branchId: branch.id,
        number: 2,
        label: null,
        status: 'open',
        assignedUserId: teller2.id,
      },
    }),
    prisma.counter.upsert({
      where: { branchId_number: { branchId: branch.id, number: 3 } },
      update: {},
      create: {
        branchId: branch.id,
        number: 3,
        label: 'Comptes & Prêts',
        status: 'closed',
        assignedUserId: null,
      },
    }),
  ]);

  console.log(`Created ${counters.length} counters`);

  // Assign services to counters
  const retraitService = services.find((s) => s.prefix === 'A')!;
  const depotService = services.find((s) => s.prefix === 'B')!;
  const compteService = services.find((s) => s.prefix === 'C')!;
  const pretService = services.find((s) => s.prefix === 'D')!;
  const changeService = services.find((s) => s.prefix === 'E')!;

  // Counter 1: Retrait, Dépôt, Change (fast services)
  await prisma.counterService.createMany({
    data: [
      { counterId: counters[0].id, serviceId: retraitService.id },
      { counterId: counters[0].id, serviceId: depotService.id },
      { counterId: counters[0].id, serviceId: changeService.id },
    ],
    skipDuplicates: true,
  });

  // Counter 2: All services
  await prisma.counterService.createMany({
    data: [
      { counterId: counters[1].id, serviceId: retraitService.id },
      { counterId: counters[1].id, serviceId: depotService.id },
      { counterId: counters[1].id, serviceId: compteService.id },
      { counterId: counters[1].id, serviceId: pretService.id },
      { counterId: counters[1].id, serviceId: changeService.id },
    ],
    skipDuplicates: true,
  });

  // Counter 3: Compte, Prêt (slower services)
  await prisma.counterService.createMany({
    data: [
      { counterId: counters[2].id, serviceId: compteService.id },
      { counterId: counters[2].id, serviceId: pretService.id },
    ],
    skipDuplicates: true,
  });

  console.log('Assigned services to counters');

  // Create some demo tickets
  const now = new Date();
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        branchId: branch.id,
        serviceCategoryId: retraitService.id,
        ticketNumber: 'A-001',
        status: 'serving',
        priority: 'normal',
        customerPhone: '+21620123456',
        notificationChannel: 'sms',
        checkinMethod: 'kiosk',
        counterId: counters[0].id,
        servedByUserId: teller1.id,
        calledAt: new Date(now.getTime() - 5 * 60000),
        servingStartedAt: new Date(now.getTime() - 3 * 60000),
      },
    }),
    prisma.ticket.create({
      data: {
        branchId: branch.id,
        serviceCategoryId: depotService.id,
        ticketNumber: 'B-001',
        status: 'waiting',
        priority: 'normal',
        customerPhone: '+21698765432',
        notificationChannel: 'whatsapp',
        checkinMethod: 'mobile',
      },
    }),
    prisma.ticket.create({
      data: {
        branchId: branch.id,
        serviceCategoryId: retraitService.id,
        ticketNumber: 'A-002',
        status: 'waiting',
        priority: 'normal',
        customerPhone: null,
        notificationChannel: 'none',
        checkinMethod: 'kiosk',
      },
    }),
    prisma.ticket.create({
      data: {
        branchId: branch.id,
        serviceCategoryId: compteService.id,
        ticketNumber: 'C-001',
        status: 'waiting',
        priority: 'vip',
        customerPhone: '+21655555555',
        notificationChannel: 'sms',
        checkinMethod: 'manual',
      },
    }),
    prisma.ticket.create({
      data: {
        branchId: branch.id,
        serviceCategoryId: changeService.id,
        ticketNumber: 'E-001',
        status: 'waiting',
        priority: 'normal',
        customerPhone: '+21644444444',
        notificationChannel: 'sms',
        checkinMethod: 'kiosk',
      },
    }),
  ]);

  // Update counter 1 with current ticket
  await prisma.counter.update({
    where: { id: counters[0].id },
    data: { currentTicketId: tickets[0].id },
  });

  console.log(`Created ${tickets.length} demo tickets`);

  // Create ticket history for the serving ticket
  await prisma.ticketHistory.createMany({
    data: [
      {
        ticketId: tickets[0].id,
        action: 'created',
        metadata: { checkinMethod: 'kiosk', position: 1 },
        createdAt: new Date(now.getTime() - 10 * 60000),
      },
      {
        ticketId: tickets[0].id,
        action: 'called',
        actorId: teller1.id,
        metadata: { counterId: counters[0].id, counterNumber: 1 },
        createdAt: new Date(now.getTime() - 5 * 60000),
      },
      {
        ticketId: tickets[0].id,
        action: 'serving',
        actorId: teller1.id,
        createdAt: new Date(now.getTime() - 3 * 60000),
      },
    ],
  });

  console.log('Created ticket history entries');

  console.log('\n✅ Database seeded successfully!');
  console.log('\nTest credentials:');
  console.log('  Super Admin:    admin@blesaf.app / demo123');
  console.log('  Bank Admin:     bank.admin@demo-bank.tn / demo123');
  console.log('  Branch Manager: manager@demo-bank.tn / demo123');
  console.log('  Teller 1:       teller1@demo-bank.tn / demo123');
  console.log('  Teller 2:       teller2@demo-bank.tn / demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
