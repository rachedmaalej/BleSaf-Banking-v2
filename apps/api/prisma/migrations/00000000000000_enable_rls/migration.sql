-- Enable Row Level Security on tenant-scoped tables
-- This provides database-level tenant isolation

-- Enable RLS on tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Counter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyBranchStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HourlySnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CounterService" ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current tenant from session variable
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '')::uuid;
$$ LANGUAGE SQL STABLE;

-- Tenant policies (super_admin bypass, others see only their tenant)
CREATE POLICY tenant_isolation_tenant ON "Tenant"
  USING (
    current_tenant_id() IS NULL -- Super admin (no tenant set)
    OR id = current_tenant_id()
  );

-- Branch policies
CREATE POLICY tenant_isolation_branch ON "Branch"
  USING (
    current_tenant_id() IS NULL
    OR "tenantId" = current_tenant_id()
  );

-- Counter policies (via branch)
CREATE POLICY tenant_isolation_counter ON "Counter"
  USING (
    current_tenant_id() IS NULL
    OR "branchId" IN (
      SELECT id FROM "Branch" WHERE "tenantId" = current_tenant_id()
    )
  );

-- ServiceCategory policies (via branch)
CREATE POLICY tenant_isolation_service_category ON "ServiceCategory"
  USING (
    current_tenant_id() IS NULL
    OR "branchId" IN (
      SELECT id FROM "Branch" WHERE "tenantId" = current_tenant_id()
    )
  );

-- Ticket policies (via branch)
CREATE POLICY tenant_isolation_ticket ON "Ticket"
  USING (
    current_tenant_id() IS NULL
    OR "branchId" IN (
      SELECT id FROM "Branch" WHERE "tenantId" = current_tenant_id()
    )
  );

-- User policies
CREATE POLICY tenant_isolation_user ON "User"
  USING (
    current_tenant_id() IS NULL
    OR "tenantId" = current_tenant_id()
  );

-- RefreshToken policies (via user)
CREATE POLICY tenant_isolation_refresh_token ON "RefreshToken"
  USING (
    current_tenant_id() IS NULL
    OR "userId" IN (
      SELECT id FROM "User" WHERE "tenantId" = current_tenant_id()
    )
  );

-- TicketHistory policies (via ticket -> branch)
CREATE POLICY tenant_isolation_ticket_history ON "TicketHistory"
  USING (
    current_tenant_id() IS NULL
    OR "ticketId" IN (
      SELECT t.id FROM "Ticket" t
      JOIN "Branch" b ON t."branchId" = b.id
      WHERE b."tenantId" = current_tenant_id()
    )
  );

-- NotificationLog policies (via ticket -> branch)
CREATE POLICY tenant_isolation_notification_log ON "NotificationLog"
  USING (
    current_tenant_id() IS NULL
    OR "ticketId" IN (
      SELECT t.id FROM "Ticket" t
      JOIN "Branch" b ON t."branchId" = b.id
      WHERE b."tenantId" = current_tenant_id()
    )
  );

-- DailyBranchStats policies (via branch)
CREATE POLICY tenant_isolation_daily_stats ON "DailyBranchStats"
  USING (
    current_tenant_id() IS NULL
    OR "branchId" IN (
      SELECT id FROM "Branch" WHERE "tenantId" = current_tenant_id()
    )
  );

-- HourlySnapshot policies (via branch)
CREATE POLICY tenant_isolation_hourly_snapshot ON "HourlySnapshot"
  USING (
    current_tenant_id() IS NULL
    OR "branchId" IN (
      SELECT id FROM "Branch" WHERE "tenantId" = current_tenant_id()
    )
  );

-- CounterService policies (via counter -> branch)
CREATE POLICY tenant_isolation_counter_service ON "CounterService"
  USING (
    current_tenant_id() IS NULL
    OR "counterId" IN (
      SELECT c.id FROM "Counter" c
      JOIN "Branch" b ON c."branchId" = b.id
      WHERE b."tenantId" = current_tenant_id()
    )
  );

-- Grant necessary permissions to the app user
-- Note: In production, replace 'blesaf_app' with your actual database user
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO blesaf_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO blesaf_app;
