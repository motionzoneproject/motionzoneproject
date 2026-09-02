-- AlterEnum: ta bort CREATED, PAID och COMPLETED ur OrderStatus.
--
-- Ingen av dem sätts någonstans i koden, och ingen rad i vare sig "order" eller
-- "order_status_event" har dem. COMPLETED lades till i 20260320092147 och kom
-- aldrig till användning.
--
-- PENDING_PAYMENT står kvar med flit. Den är utgången — 20260825200000 flyttade
-- alla ordrar ur den och bytte default till AWAITING_APPROVAL — men
-- "order_status_event" har fortfarande rader med den, och den loggen ska visa
-- vad som faktiskt hände, inte skrivas om i efterhand.
--
-- OBS vid deploy: castarna nedan fäller hela migrationen (transaktionen rullas
-- tillbaka, inget halvvägs) om målbasen har rader med något av de tre borttagna
-- värdena. Kör scripts/check-order-status.ts mot basen först.

BEGIN;

CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING_PAYMENT', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELLED');

ALTER TABLE "order" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "order"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING ("status"::text::"OrderStatus_new");

ALTER TABLE "order_status_event"
  ALTER COLUMN "fromStatus" TYPE "OrderStatus_new"
  USING ("fromStatus"::text::"OrderStatus_new");

ALTER TABLE "order_status_event"
  ALTER COLUMN "toStatus" TYPE "OrderStatus_new"
  USING ("toStatus"::text::"OrderStatus_new");

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";

ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'AWAITING_APPROVAL';

COMMIT;
