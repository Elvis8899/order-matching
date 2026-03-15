import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";
import { UUID } from "@shared/uuid/entities/uuid";
import { z } from "zod";

export const Match = z
  .object({
    id: UUID,
    price: z.number(),
    volume: z.number(),
    buyOrderId: UUID,
    sellOrderId: UUID,
    buyUserId: UUID,
    sellUserId: UUID,
  })
  .and(BaseDateEntity);

export type Match = z.infer<typeof Match>;

export const MatchStatistics = z.object({
  btcVolume24h: z.number(),
  usdVolume24h: z.number(),
  lastPrice: z.number().nullable(),
  high24h: z.number().nullable(),
  low24h: z.number().nullable(),
});

export type MatchStatistics = z.infer<typeof MatchStatistics>;
