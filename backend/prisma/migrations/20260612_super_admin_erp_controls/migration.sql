ALTER TABLE "pharmacies" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMPTZ(6);

ALTER TABLE "advertisements" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "advertisements" ADD COLUMN IF NOT EXISTS "clickCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "pharmacies_archivedAt_idx" ON "pharmacies"("archivedAt");
