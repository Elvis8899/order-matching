import { z } from "zod";

export const MATCH_CREATED = "match.created";

export const MatchCreatedEvent = z.object({
  eventKey: z.literal(MATCH_CREATED),
  payload: z.object({
    ids: z.array(z.string()),
    userIds: z.array(z.string()),
  }),
});

export type MatchCreatedEvent = z.infer<typeof MatchCreatedEvent>;
