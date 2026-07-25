-- Composite unique (tenantId, email) does not catch collisions across rows
-- where tenantId is NULL (Postgres treats each NULL as distinct), which is
-- the case for SUPERADMIN users. This partial index enforces global email
-- uniqueness specifically among platform-level (tenantId IS NULL) users.
CREATE UNIQUE INDEX "users_superadmin_email_unique" ON "User" (email) WHERE "tenantId" IS NULL;
