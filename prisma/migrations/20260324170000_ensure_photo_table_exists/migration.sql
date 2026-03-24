-- Ensure the Photo table exists for environments where an earlier migration
-- was applied without actually creating it.
CREATE TABLE IF NOT EXISTS "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "description" TEXT,
    "eventId" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Photo_eventId_fkey'
    ) THEN
        ALTER TABLE "Photo"
        ADD CONSTRAINT "Photo_eventId_fkey"
        FOREIGN KEY ("eventId")
        REFERENCES "Event"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;
