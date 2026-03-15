import { z } from "zod";

export const USER_DELETED = "user.deleted";

export const UserDeletedEvent = z.object({
  eventKey: z.literal(USER_DELETED),
  payload: z.object({
    id: z.string(),
    username: z.string(),
  }),
});

export type UserDeletedEvent = z.infer<typeof UserDeletedEvent>;
