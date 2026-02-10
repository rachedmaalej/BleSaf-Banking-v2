/**
 * Data Migration: Link existing ServiceCategory records to ServiceTemplates
 *
 * This script auto-matches branch services to templates by nameFr within the same tenant.
 * For matched services:
 * - Sets sourceTemplateId to the template's id
 * - Sets templateVersion to 1 (initial version)
 * - If nameAr or icon differ from the template, adds them to overriddenFields
 *
 * Run: npx tsx prisma/migrate-service-links.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Service Link Migration ===\n');

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  let totalMatched = 0;
  let totalUnmatched = 0;
  let totalSkippedAlreadyLinked = 0;

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (${tenant.id})`);

    // Get all active templates for this tenant
    const templates = await prisma.serviceTemplate.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, nameFr: true, nameAr: true, icon: true },
    });

    // Build lookup by nameFr
    const templateByName = new Map(templates.map((t) => [t.nameFr.toLowerCase().trim(), t]));

    // Get all branches for this tenant
    const branches = await prisma.branch.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true },
    });

    for (const branch of branches) {
      // Get all services for this branch
      const services = await prisma.serviceCategory.findMany({
        where: { branchId: branch.id },
        select: {
          id: true,
          nameFr: true,
          nameAr: true,
          icon: true,
          sourceTemplateId: true,
        },
      });

      let branchMatched = 0;
      let branchUnmatched = 0;
      let branchSkipped = 0;

      for (const service of services) {
        // Skip if already linked
        if (service.sourceTemplateId) {
          branchSkipped++;
          continue;
        }

        const template = templateByName.get(service.nameFr.toLowerCase().trim());

        if (template) {
          // Determine which identity fields differ (= locally overridden)
          const overriddenFields: string[] = [];

          if (service.nameAr !== template.nameAr) {
            overriddenFields.push('nameAr');
          }
          if (service.icon !== template.icon) {
            overriddenFields.push('icon');
          }
          // nameFr matches by definition (that's how we found the template)

          await prisma.serviceCategory.update({
            where: { id: service.id },
            data: {
              sourceTemplateId: template.id,
              templateVersion: 1,
              overriddenFields: overriddenFields,
            },
          });

          branchMatched++;

          if (overriddenFields.length > 0) {
            console.log(
              `  [MATCHED+OVERRIDE] "${service.nameFr}" → template "${template.nameFr}" (overrides: ${overriddenFields.join(', ')})`
            );
          }
        } else {
          branchUnmatched++;
          console.log(`  [UNMATCHED] "${service.nameFr}" in ${branch.name} - no matching template`);
        }
      }

      if (branchMatched > 0 || branchUnmatched > 0) {
        console.log(
          `  Branch ${branch.name}: ${branchMatched} matched, ${branchUnmatched} unmatched, ${branchSkipped} already linked`
        );
      }

      totalMatched += branchMatched;
      totalUnmatched += branchUnmatched;
      totalSkippedAlreadyLinked += branchSkipped;
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Total matched & linked: ${totalMatched}`);
  console.log(`Total unmatched (no template found): ${totalUnmatched}`);
  console.log(`Total skipped (already linked): ${totalSkippedAlreadyLinked}`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
