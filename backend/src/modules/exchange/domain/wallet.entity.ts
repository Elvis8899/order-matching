import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";
import { UUID } from "@shared/uuid/entities/uuid";
import { z } from "zod";

export const Wallet = z
  .object({
    id: UUID,
    btc: z.number(),
    usd: z.number(),
  })
  .and(BaseDateEntity);

export type Wallet = z.infer<typeof Wallet>;
