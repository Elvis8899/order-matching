import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";
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
    price: z.number(),
    amount: z.number(),
    filled: z.number().default(0),
    status: z.enum(OrderStatusEnum).default(OrderStatusEnum.Active),
    userId: UUID,
  })
  .and(BaseDateEntity);

export type Order = z.infer<typeof Order>;
