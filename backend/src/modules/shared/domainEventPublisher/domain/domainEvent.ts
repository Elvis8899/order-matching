import { AllExchangeEvents } from "@exchange/domain/events";
import { AllUserEvents } from "@user/domain/events";
import { z } from "zod";

export const DomainEvent = z.discriminatedUnion("eventKey", [
  ...AllUserEvents,
  ...AllExchangeEvents,
]);

export type DomainEvent = z.infer<typeof DomainEvent>;
