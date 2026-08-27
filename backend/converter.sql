-- 1. Converter valores de Float para Integer (centavos multiplicando por 100)
ALTER TABLE "system_config"
  ALTER COLUMN "platformFee" TYPE INTEGER USING ROUND("platformFee" * 100),
  ALTER COLUMN "minFee" TYPE INTEGER USING ROUND("minFee" * 100),
  ALTER COLUMN "premiumPrice" TYPE INTEGER USING ROUND("premiumPrice" * 100),
  ALTER COLUMN "standardPrice" TYPE INTEGER USING ROUND("standardPrice" * 100);

ALTER TABLE "events"
  ALTER COLUMN "priceFrom" TYPE INTEGER USING ROUND("priceFrom" * 100),
  ALTER COLUMN "highlightFee" TYPE INTEGER USING ROUND("highlightFee" * 100);

ALTER TABLE "ticket_types"
  ALTER COLUMN "price" TYPE INTEGER USING ROUND("price" * 100);

ALTER TABLE "coupons"
  ALTER COLUMN "discountValue" TYPE INTEGER USING ROUND("discountValue" * 100),
  ALTER COLUMN "minPurchaseAmount" TYPE INTEGER USING ROUND("minPurchaseAmount" * 100),
  ALTER COLUMN "discountType" TYPE "DiscountType" USING UPPER("discountType")::"DiscountType";

ALTER TABLE "orders"
  ALTER COLUMN "subtotal" TYPE INTEGER USING ROUND("subtotal" * 100),
  ALTER COLUMN "discountAmount" TYPE INTEGER USING ROUND("discountAmount" * 100),
  ALTER COLUMN "platformFee" TYPE INTEGER USING ROUND("platformFee" * 100),
  ALTER COLUMN "totalAmount" TYPE INTEGER USING ROUND("totalAmount" * 100);

ALTER TABLE "order_items"
  ALTER COLUMN "unitPrice" TYPE INTEGER USING ROUND("unitPrice" * 100);

-- 2. Criar novo Enum e atualizar os status textuais dos Tickets antigos para o padrão seguro
CREATE TYPE "IssuedTicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED', 'REFUNDED');

ALTER TABLE "tickets"
  ALTER COLUMN "price" TYPE INTEGER USING ROUND("price" * 100),
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "IssuedTicketStatus" USING UPPER("status")::"IssuedTicketStatus",
  ALTER COLUMN "status" SET DEFAULT 'VALID'::"IssuedTicketStatus";