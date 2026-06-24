UPDATE "RepairOrder"
SET "orderNumber" = regexp_replace("orderNumber", '^R-', '', 'i')
WHERE "orderNumber" ~* '^R-';
