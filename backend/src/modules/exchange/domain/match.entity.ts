import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";
import { Decimal, DecimalType } from "@shared/utils/domain/decimal";
import { UUID } from "@shared/uuid/entities/uuid";
import { z } from "zod";

export const MATCH_MAKER_FEE = new Decimal("0.005"); // 0.5%
export const MATCH_TAKER_FEE = new Decimal("0.003"); // 0.3%

export const Match = z
  .object({
    id: UUID,
    price: DecimalType,
    volume: DecimalType,
    buyOrderId: UUID,
    sellOrderId: UUID,
    buyUserId: UUID,
    sellUserId: UUID,
  })
  .and(BaseDateEntity);

export type Match = z.infer<typeof Match>;

export const MatchStatistics = z.object({
  btcVolume24h: DecimalType,
  usdVolume24h: DecimalType,
  lastPrice: DecimalType.nullable(),
  high24h: DecimalType.nullable(),
  low24h: DecimalType.nullable(),
});

export type MatchStatistics = z.infer<typeof MatchStatistics>;
