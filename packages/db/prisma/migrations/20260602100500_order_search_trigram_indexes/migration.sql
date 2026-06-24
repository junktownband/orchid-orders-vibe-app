CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "RepairOrder_orderNumber_trgm_idx"
ON "RepairOrder" USING GIN ("orderNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Customer_name_trgm_idx"
ON "Customer" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Customer_phone_trgm_idx"
ON "Customer" USING GIN ("phone" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Customer_phoneNormalized_trgm_idx"
ON "Customer" USING GIN ("phoneNormalized" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Instrument_brand_trgm_idx"
ON "Instrument" USING GIN ("brand" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Instrument_model_trgm_idx"
ON "Instrument" USING GIN ("model" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Instrument_type_trgm_idx"
ON "Instrument" USING GIN ("type" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "User_name_trgm_idx"
ON "User" USING GIN ("name" gin_trgm_ops);
