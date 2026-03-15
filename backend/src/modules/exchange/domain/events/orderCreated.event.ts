import { z } from "zod";

export const ORDER_CREATED = "order.created";

export const OrderCreatedEvent = z.object({
  eventKey: z.literal(ORDER_CREATED),
  payload: z.object({
    id: z.string(),
  }),
});

export type OrderCreatedEvent = z.infer<typeof OrderCreatedEvent>;
