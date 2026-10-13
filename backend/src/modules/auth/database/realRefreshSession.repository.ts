import { RefreshSessionRepository } from "@auth/database/refreshSession.repository.port";
import {
  RefreshSession,
  RotateRefreshSession,
} from "@auth/domain/refreshSession.entity";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { FPF, TE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { unknownException } from "@shared/utils/domain/shared.errors";

@Injectable()
export class RealRefreshSessionRepository implements RefreshSessionRepository {
  constructor(private prisma: PrismaService) {}

  private defaultErrorException = unknownException;

  private createOne = TE.tryCatchK(
    this.prisma.refreshSession.create.bind(this.prisma.refreshSession),
    this.defaultErrorException,
  );

  private updateMany = TE.tryCatchK(
    this.prisma.refreshSession.updateMany.bind(this.prisma.refreshSession),
    this.defaultErrorException,
  );

  private deleteMany = TE.tryCatchK(
    this.prisma.refreshSession.deleteMany.bind(this.prisma.refreshSession),
    this.defaultErrorException,
  );

  create = (session: RefreshSession): TE.TaskEither<Error, void> =>
    FPF.pipe(this.createOne({ data: session }), TE.map(noop));

  // Conditional update, so two concurrent uses of one token cannot both win
  rotate = ({
    id,
    jti,
    newJti,
    expiresAt,
  }: RotateRefreshSession): TE.TaskEither<Error, boolean> =>
    FPF.pipe(
      this.updateMany({
        where: { id, currentJti: jti },
        data: { currentJti: newJti, expiresAt },
      }),
      TE.map(({ count }) => count === 1),
    );

  deleteById = (id: string): TE.TaskEither<Error, void> =>
    FPF.pipe(this.deleteMany({ where: { id } }), TE.map(noop));

  deleteExpired = (userId: string): TE.TaskEither<Error, void> =>
    FPF.pipe(
      this.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } }),
      TE.map(noop),
    );
}
