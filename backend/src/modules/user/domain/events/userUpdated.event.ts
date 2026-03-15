import { z } from "zod";

export const USER_UPDATED = "user.updated";

export const UserUpdatedEvent = z.object({
  eventKey: z.literal(USER_UPDATED),
  payload: z.object({
    id: z.string(),
    username: z.string(),
  }),
});

export type UserUpdatedEvent = z.infer<typeof UserUpdatedEvent>;
