import { MatchStatistics } from "@exchange/domain/match.entity";
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

export const SOCKET_MATCH_CREATED = "socket.match.created";

export const SocketMatchCreatedEvent = z.object({
  eventKey: z.literal(SOCKET_MATCH_CREATED),
  payload: MatchStatistics,
});

export type SocketMatchCreatedEvent = z.infer<typeof SocketMatchCreatedEvent>;
