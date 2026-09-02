-- Rensa OrderStatus till bara den levande livscykeln:
--   AWAITING_APPROVAL -> APPROVED | CANCELLED
--
-- CREATED, PENDING_PAYMENT, PAID och COMPLETED sätts inte längre av någon kod.
-- CREATED, PAID och COMPLETED finns dessutom inte i en enda rad; COMPLETED
-- lades till i 20260320092147 och kom aldrig till användning.
--
-- PENDING_PAYMENT är däremot inte spårlös: 20260825200000 flyttade alla ordrar
-- ur statusen, men "order_status_event" har kvar rader med den. Det är en
-- revisionslogg, och den ska bevara vad som faktiskt hände.
--
-- Därför frikopplas loggen från enumet i stället för att något av dem offras:
-- fromStatus/toStatus blir text. Då kan loggen innehålla utgångna statusar utan
-- att enumet tvingas bära dem, och utan att historiken skrivs om. Ordertabellen
-- behåller enumet, eftersom den beskriver nuet och ska vara begränsad.

BEGIN;

-- 1. Loggen blir text. Värdena är oförändrade, bara typen byts.
ALTER TABLE "order_status_event"
  ALTER COLUMN "fromStatus" TYPE TEXT USING "fromStatus"::text;

ALTER TABLE "order_status_event"
  ALTER COLUMN "toStatus" TYPE TEXT USING "toStatus"::text;

-- 2. Enumet byggs om med bara de levande värdena. Nu när loggen är text är
--    "order"."status" enda kvarvarande användningen.
--
--    Castet nedan fäller hela transaktionen om någon rad i "order" har ett
--    borttaget värde. Inget skrivs halvvägs, men migrationen misslyckas —
--    kör scripts/check-order-status.ts mot basen först.
CREATE TYPE "OrderStatus_new" AS ENUM ('AWAITING_APPROVAL', 'APPROVED', 'CANCELLED');

ALTER TABLE "order" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "order"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING ("status"::text::"OrderStatus_new");

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";

ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'AWAITING_APPROVAL';

COMMIT;
