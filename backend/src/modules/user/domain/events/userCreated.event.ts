import { z } from "zod";

export const USER_CREATED = "user.created";

export const UserCreatedEvent = z.object({
  eventKey: z.literal(USER_CREATED),
  payload: z.object({
    id: z.string(),
    username: z.string(),
  }),
});

export type UserCreatedEvent = z.infer<typeof UserCreatedEvent>;
