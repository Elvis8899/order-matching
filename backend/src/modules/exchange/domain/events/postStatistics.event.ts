import { MatchStatistics } from "@src/modules/exchange/domain/match.entity";
import { z } from "zod";

export const POST_STATISTICS = "post.match.statistics";

export const PostStatisticsEvent = z.object({
  eventKey: z.literal(POST_STATISTICS),
  payload: MatchStatistics,
});

export type PostStatisticsEvent = z.infer<typeof PostStatisticsEvent>;
