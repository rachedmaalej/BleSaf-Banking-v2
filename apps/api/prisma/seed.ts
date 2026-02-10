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

  // Create service templates (bank-level definitions)
  const templateDefs = [
    {
      nameFr: 'Retrait / Dépôt',
      nameAr: 'سحب / إيداع',
      prefix: 'A',
      icon: 'local_atm',
      priorityWeight: 1,
      avgServiceTime: 5,
      descriptionFr: 'Opérations de caisse courantes',
      descriptionAr: 'عمليات الصندوق الجارية',
      subServicesFr: ["Retrait d'espèces", "Dépôt d'espèces"],
      subServicesAr: ['سحب نقدي', 'إيداع نقدي'],
      displayOrder: 0,
    },
    {
      nameFr: 'Virements',
      nameAr: 'تحويلات',
      prefix: 'B',
      icon: 'swap_horiz',
      priorityWeight: 1,
      avgServiceTime: 8,
      descriptionFr: 'Émission et suivi de virements',
      descriptionAr: 'إصدار ومتابعة التحويلات',
      subServicesFr: ['Émission de virement'],
      subServicesAr: ['تحويل بنكي'],
      displayOrder: 1,
    },
    {
      nameFr: 'Cartes & Documents',
      nameAr: 'بطاقات ووثائق',
      prefix: 'C',
      icon: 'credit_card',
      priorityWeight: 1,
      avgServiceTime: 10,
      descriptionFr: 'Cartes bancaires, chéquiers et relevés',
      descriptionAr: 'بطاقات بنكية وشيكات وكشوفات',
      subServicesFr: ['Retrait de carte bancaire', 'Réinitialisation code carte', 'Relevé de compte', 'Retrait de chéquier'],
      subServicesAr: ['استلام بطاقة بنكية', 'إعادة تعيين رمز البطاقة', 'كشف حساب', 'استلام دفتر شيكات'],
      displayOrder: 2,
    },
    {
      nameFr: 'Autres services',
      nameAr: 'خدمات أخرى',
      prefix: 'D',
      icon: 'more_horiz',
      priorityWeight: 1,
      avgServiceTime: 7,
      descriptionFr: 'Renseignements et mises à jour',
      descriptionAr: 'استفسارات وتحديثات',
      subServicesFr: ['Renseignements divers', 'Mise à jour de données'],
      subServicesAr: ['استفسارات متنوعة', 'تحديث البيانات'],
      displayOrder: 3,
    },
  ];

  const templates = await Promise.all(
    templateDefs.map((def) =>
      prisma.serviceTemplate.upsert({
        where: { tenantId_nameFr: { tenantId: tenant.id, nameFr: def.nameFr } },
        update: {
          nameAr: def.nameAr,
          icon: def.icon,
          subServicesFr: def.subServicesFr,
          subServicesAr: def.subServicesAr,
          descriptionFr: def.descriptionFr,
          descriptionAr: def.descriptionAr,
          displayOrder: def.displayOrder,
        },
        create: {
          tenantId: tenant.id,
          ...def,
          isActive: true,
          showOnKiosk: true,
          version: 1,
        },
      })
    )
  );

  console.log(`Created ${templates.length} service templates`);

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

  // Deploy templates to branch (creates linked ServiceCategory records)
  const services = await Promise.all(
    templates.map((template) =>
      prisma.serviceCategory.upsert({
        where: { branchId_prefix: { branchId: branch.id, prefix: template.prefix } },
        update: {
          nameAr: template.nameAr,
          nameFr: template.nameFr,
          icon: template.icon,
          priorityWeight: template.priorityWeight,
          avgServiceTime: template.avgServiceTime,
          descriptionFr: template.descriptionFr,
          descriptionAr: template.descriptionAr,
          serviceGroup: template.serviceGroup,
          subServicesFr: template.subServicesFr,
          subServicesAr: template.subServicesAr,
          displayOrder: template.displayOrder,
          showOnKiosk: template.showOnKiosk,
          sourceTemplateId: template.id,
          templateVersion: template.version,
        },
        create: {
          branchId: branch.id,
          nameAr: template.nameAr,
          nameFr: template.nameFr,
          prefix: template.prefix,
          icon: template.icon,
          priorityWeight: template.priorityWeight,
          avgServiceTime: template.avgServiceTime,
          descriptionFr: template.descriptionFr,
          descriptionAr: template.descriptionAr,
          serviceGroup: template.serviceGroup,
          subServicesFr: template.subServicesFr,
          subServicesAr: template.subServicesAr,
          displayOrder: template.displayOrder,
          showOnKiosk: template.showOnKiosk,
          sourceTemplateId: template.id,
          templateVersion: template.version,
          overriddenFields: [],
          isActive: true,
        },
      })
    )
  );

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
  const serviceA = services.find((s) => s.prefix === 'A')!; // Retrait / Dépôt
  const serviceB = services.find((s) => s.prefix === 'B')!; // Virements
  const serviceC = services.find((s) => s.prefix === 'C')!; // Cartes & Documents
  const serviceD = services.find((s) => s.prefix === 'D')!; // Autres services

  // Counter 1: Retrait/Dépôt, Virements (fast services)
  await prisma.counterService.createMany({
    data: [
      { counterId: counters[0].id, serviceId: serviceA.id },
      { counterId: counters[0].id, serviceId: serviceB.id },
    ],
    skipDuplicates: true,
  });

  // Counter 2: All services
  await prisma.counterService.createMany({
    data: [
      { counterId: counters[1].id, serviceId: serviceA.id },
      { counterId: counters[1].id, serviceId: serviceB.id },
      { counterId: counters[1].id, serviceId: serviceC.id },
      { counterId: counters[1].id, serviceId: serviceD.id },
    ],
    skipDuplicates: true,
  });

  // Counter 3: Cartes & Documents, Autres (longer services)
  await prisma.counterService.createMany({
    data: [
      { counterId: counters[2].id, serviceId: serviceC.id },
      { counterId: counters[2].id, serviceId: serviceD.id },
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
        serviceCategoryId: serviceA.id,
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
        serviceCategoryId: serviceB.id,
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
        serviceCategoryId: serviceA.id,
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
        serviceCategoryId: serviceC.id,
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
        serviceCategoryId: serviceD.id,
        ticketNumber: 'D-001',
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
