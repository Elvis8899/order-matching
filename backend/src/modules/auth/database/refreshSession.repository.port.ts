import {
  RefreshSession,
  RotateRefreshSession,
} from "@auth/domain/refreshSession.entity";
import { TE } from "@shared/utils/application/monads";

export abstract class RefreshSessionRepository {
  create!: (session: RefreshSession) => TE.TaskEither<Error, void>;
  /**
   * Atomically replaces the session's jti, only if it still is `jti`.
   * Returns false when that refresh token was already used or the session
   * no longer exists.
   */
  rotate!: (params: RotateRefreshSession) => TE.TaskEither<Error, boolean>;
  /** Revokes the session. Does not fail if it no longer exists. */
  deleteById!: (id: string) => TE.TaskEither<Error, void>;
  /** Removes the user's expired sessions. */
  deleteExpired!: (userId: string) => TE.TaskEither<Error, void>;
}
