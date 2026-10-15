import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";
import { DecimalType } from "@shared/utils/domain/decimal";
import { UUID } from "@shared/uuid/entities/uuid";
import { z } from "zod";

export const Wallet = z
  .object({
    id: UUID,
    btc: DecimalType,
    usd: DecimalType,
  })
  .and(BaseDateEntity);

export type Wallet = z.infer<typeof Wallet>;
