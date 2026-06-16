ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "advertisements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(160) NOT NULL,
  "text" TEXT,
  "imageUrl" VARCHAR(500),
  "targetUrl" VARCHAR(500),
  "placement" VARCHAR(80) NOT NULL DEFAULT 'HOME_HERO',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMPTZ(6),
  "endsAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "advertisements_placement_idx" ON "advertisements"("placement");
CREATE INDEX IF NOT EXISTS "advertisements_isActive_idx" ON "advertisements"("isActive");
CREATE INDEX IF NOT EXISTS "advertisements_startsAt_idx" ON "advertisements"("startsAt");
CREATE INDEX IF NOT EXISTS "advertisements_endsAt_idx" ON "advertisements"("endsAt");

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "key" VARCHAR(120) NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);
