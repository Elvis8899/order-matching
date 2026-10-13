import { RefreshSessionRepository } from "@auth/database/refreshSession.repository.port";
import {
  RefreshSession,
  RotateRefreshSession,
} from "@auth/domain/refreshSession.entity";
import { Injectable } from "@nestjs/common";
import { FPF, O, TE } from "@shared/utils/application/monads";
import { validateFromUnknown } from "@shared/utils/application/validateWith";
import { FakeRepository } from "@shared/utils/database/fakeRepository.base";

@Injectable()
export class FakeRefreshSessionRepository
  extends FakeRepository<RefreshSession>
  implements RefreshSessionRepository
{
  protected readonly validate = validateFromUnknown(
    RefreshSession,
    "RefreshSession",
  );

  create = (session: RefreshSession): TE.TaskEither<Error, void> =>
    this.save(session);

  /** Swaps the session's jti only if `jti` is still the current one. */
  rotate = ({
    id,
    jti,
    newJti,
    expiresAt,
  }: RotateRefreshSession): TE.TaskEither<Error, boolean> =>
    FPF.pipe(
      this.first((session) => session.id === id && session.currentJti === jti),
      O.match(
        () => TE.of(false),
        () =>
          FPF.pipe(
            this.save({ id, currentJti: newJti, expiresAt }),
            TE.map(() => true),
          ),
      ),
    );

  deleteExpired = (userId: string): TE.TaskEither<Error, void> => {
    const now = new Date();
    this.list((s) => s.userId === userId && s.expiresAt < now).forEach((s) =>
      this.rows.delete(s.id),
    );
    return TE.of(undefined);
  };
}
