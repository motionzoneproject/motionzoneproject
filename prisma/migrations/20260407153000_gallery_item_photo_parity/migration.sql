-- Add image-parity fields to gallery_item without removing Photo yet.
ALTER TABLE "gallery_item"
    ADD COLUMN IF NOT EXISTS "caption" TEXT,
    ADD COLUMN IF NOT EXISTS "eventId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'gallery_item_eventId_fkey'
    ) THEN
        ALTER TABLE "gallery_item"
        ADD CONSTRAINT "gallery_item_eventId_fkey"
        FOREIGN KEY ("eventId")
        REFERENCES "Event"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "gallery_item_eventId_idx"
    ON "gallery_item"("eventId");

CREATE INDEX IF NOT EXISTS "gallery_item_active_displayOrder_idx"
    ON "gallery_item"("active", "displayOrder");

INSERT INTO "gallery_item" (
    "id",
    "type",
    "title",
    "caption",
    "description",
    "url",
    "thumbnailUrl",
    "displayOrder",
    "active",
    "eventId",
    "createdAt",
    "updatedAt"
)
SELECT
    p."id",
    'IMAGE'::"GalleryItemType",
    COALESCE(NULLIF(TRIM(p."caption"), ''), e."headline", 'Bild'),
    p."caption",
    p."description",
    p."url",
    NULL,
    0,
    p."isVisible",
    p."eventId",
    p."createdAt",
    p."updatedAt"
FROM "Photo" p
LEFT JOIN "Event" e
    ON e."id" = p."eventId"
LEFT JOIN "gallery_item" gi
    ON gi."id" = p."id"
    OR (gi."type" = 'IMAGE'::"GalleryItemType" AND gi."url" = p."url")
WHERE gi."id" IS NULL;