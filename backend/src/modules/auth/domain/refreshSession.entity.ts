import { UUID } from "@shared/uuid/entities/uuid";
import { z } from "zod";

/**
 * A login session. Its refresh tokens are single-use: only the token
 * carrying `currentJti` is accepted, and each refresh replaces it.
 */
export const RefreshSession = z.object({
  id: UUID,
  userId: UUID,
  currentJti: UUID,
  expiresAt: z.date(),
});

export type RefreshSession = z.infer<typeof RefreshSession>;

export type RotateRefreshSession = {
  id: string;
  /** jti of the refresh token being used */
  jti: string;
  newJti: string;
  expiresAt: Date;
};
