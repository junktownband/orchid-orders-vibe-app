DO $$
DECLARE
  legacy_observer_role text := chr(86) || 'IEWER';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Membership"
    WHERE "role"::text = legacy_observer_role
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy observer role while legacy observer memberships exist.';
  END IF;
END $$;

CREATE TYPE "Role_new" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MASTER');

ALTER TABLE "Membership"
  ALTER COLUMN "role" TYPE "Role_new"
  USING "role"::text::"Role_new";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
