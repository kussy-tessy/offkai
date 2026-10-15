ALTER TABLE "FinanceCharge" ADD COLUMN "isBase" BOOLEAN NOT NULL DEFAULT false;
-- Existing per-person/category cells become their basic charge. Preserve every
-- ID, amount and receipt; any further rows remain separately editable extras.
WITH ranked AS (
 SELECT c."eventId", c.id, row_number() OVER (
  PARTITION BY c."eventId", c."categoryId", c."personId"
  ORDER BY CASE WHEN c.id = 'charge:' || c."categoryId" || ':' || c."personId" THEN 0
                WHEN c."amountOverride" IS NULL THEN 1 ELSE 2 END, c.position, c.id
 ) AS n FROM "FinanceCharge" c WHERE c."categoryId" IS NOT NULL
)
UPDATE "FinanceCharge" c SET "isBase" = true FROM ranked r
WHERE c."eventId" = r."eventId" AND c.id = r.id AND r.n = 1;
-- Additional charges have explicit amounts rather than following a basic price.
UPDATE "FinanceCharge" c SET "amountOverride" = cat."baseAmount"
FROM "FinanceCategory" cat WHERE NOT c."isBase" AND c."amountOverride" IS NULL
AND cat."eventId" = c."eventId" AND cat.id = c."categoryId";
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_base_category_check"
 CHECK (NOT "isBase" OR "categoryId" IS NOT NULL);
CREATE UNIQUE INDEX "FinanceCharge_one_base_per_person_category"
 ON "FinanceCharge" ("eventId", "categoryId", "personId") WHERE "isBase";
