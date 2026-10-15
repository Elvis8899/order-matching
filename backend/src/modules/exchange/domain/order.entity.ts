import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";
import {
  BTC_SCALE,
  Decimal,
  DecimalType,
  positiveDecimal,
} from "@shared/utils/domain/decimal";
import { UUID } from "@shared/uuid/entities/uuid";
import { z } from "zod";

export enum OrderStatusEnum {
  Active = "active",
  Partial = "partial",
  Complete = "complete",
  Cancelled = "cancelled",
}

export enum OrderSideEnum {
  Buy = "buy",
  Sell = "sell",
}

export const Order = z
  .object({
    id: UUID,
    side: z.enum(OrderSideEnum),
    price: DecimalType,
    amount: DecimalType,
    filled: DecimalType.default(() => new Decimal(0)),
    status: z.enum(OrderStatusEnum).default(OrderStatusEnum.Active),
    userId: UUID,
  })
  .and(BaseDateEntity);

export type Order = z.infer<typeof Order>;

/** What a new order may ask for: a cent price and a satoshi amount. Stored
 * orders are not rechecked, so rows from before these limits still load. */
export const NewOrderLimits = z.object({
  price: positiveDecimal(2),
  amount: positiveDecimal(BTC_SCALE),
});

export const GroupedOrder = z.object({
  price: DecimalType,
  amount: DecimalType,
  volume: DecimalType,
});
export type GroupedOrder = z.infer<typeof GroupedOrder>;
