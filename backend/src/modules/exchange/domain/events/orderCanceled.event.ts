import { z } from "zod";

export const ORDER_CANCELED = "order.canceled";

export const OrderCanceledEvent = z.object({
  eventKey: z.literal(ORDER_CANCELED),
  payload: z.object({
    id: z.string(),
  }),
});

export type OrderCanceledEvent = z.infer<typeof OrderCanceledEvent>;
