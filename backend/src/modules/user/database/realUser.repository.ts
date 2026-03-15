import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { FPF, O, TE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { validateFromUnknown } from "@shared/utils/application/validateWith";
import { removeEntityDates } from "@shared/utils/database/database.util";
import { Paginated } from "@shared/utils/database/repository.port";
import {
  loadPage,
  validateMaybeRow,
  validateRows,
} from "@shared/utils/database/rowValidation";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";
import { unknownException } from "@shared/utils/domain/shared.errors";
import { UserRepository } from "@user/database/user.repository.port";
import { User } from "@user/domain/user.entity";

@Injectable()
export class RealUserRepository implements UserRepository {
  constructor(private prisma: PrismaService) {}

  private baseValidator = validateFromUnknown(User, "User");

  private defaultErrorException = unknownException;

  private findMany = TE.tryCatchK(
    this.prisma.user.findMany.bind(this.prisma.user),
    this.defaultErrorException,
  );

  private findFirst = TE.tryCatchK(
    this.prisma.user.findFirst.bind(this.prisma.user),
    this.defaultErrorException,
  );
  private findUnique = TE.tryCatchK(
    this.prisma.user.findUnique.bind(this.prisma.user),
    this.defaultErrorException,
  );

  private count = TE.tryCatchK(
    this.prisma.user.count.bind(this.prisma.user),
    this.defaultErrorException,
  );

  private delete = TE.tryCatchK(
    this.prisma.user.delete.bind(this.prisma.user),
    this.defaultErrorException,
  );

  private upsert = TE.tryCatchK(
    this.prisma.user.upsert.bind(this.prisma.user),
    this.defaultErrorException,
  );

  private update = TE.tryCatchK(
    this.prisma.user.update.bind(this.prisma.user),
    this.defaultErrorException,
  );

  private updateMany = TE.tryCatchK(
    this.prisma.user.updateMany.bind(this.prisma.user),
    this.defaultErrorException,
  );

  private includeAll: Prisma.UserInclude = {};

  findAll = (): TE.TaskEither<Error, User[]> => {
    return FPF.pipe(
      this.findMany({
        include: this.includeAll,
      }),
      TE.chainEitherK(validateRows(this.baseValidator)),
    );
  };

  findAllPaginated = (
    params: PaginatedQueryParams,
  ): TE.TaskEither<Error, Paginated<User>> => {
    const where: Prisma.UserWhereInput = {};
    return loadPage(
      {
        rows: ({ skip, take }) =>
          this.findMany({
            where: where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: this.includeAll,
          }),
        total: () => this.count({ where: where }),
      },
      validateRows(this.baseValidator),
    )(params);
  };

  findById = (userId: string): TE.TaskEither<Error, O.Option<User>> => {
    return FPF.pipe(
      this.findUnique({
        where: {
          id: userId,
        },
        include: this.includeAll,
      }),
      TE.chainEitherK(validateMaybeRow(this.baseValidator)),
    );
  };

  findByUsername = (username: string): TE.TaskEither<Error, O.Option<User>> => {
    return FPF.pipe(
      this.findFirst({
        where: {
          username: username,
        },
        include: this.includeAll,
      }),
      TE.chainEitherK(validateMaybeRow(this.baseValidator)),
    );
  };

  deleteById = (userId: string): TE.TaskEither<Error, void> => {
    return FPF.pipe(
      this.delete({
        where: {
          id: userId,
        },
      }),
      TE.map(noop),
    );
  };

  save = (user: User): TE.TaskEither<Error, void> => {
    return FPF.pipe(
      this.upsert({
        where: {
          id: user.id,
        },
        update: {
          username: user.username,
          password: user.password,
          role: user.role,
        },
        create: {
          ...removeEntityDates(user),
        },
      }),

      TE.map(noop),
    );
  };

  // updateMany does not fail when the user no longer exists
  incrementTokenVersion = (userId: string): TE.TaskEither<Error, void> =>
    FPF.pipe(
      this.updateMany({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
      TE.map(noop),
    );
}
