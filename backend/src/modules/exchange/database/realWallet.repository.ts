import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { Wallet } from "@exchange/domain/wallet.entity";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { FPF, O, TE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { validateFromUnknown } from "@shared/utils/application/validateWith";
import { Paginated } from "@shared/utils/database/repository.port";
import {
  loadPage,
  validateMaybeRow,
  validateRows,
} from "@shared/utils/database/rowValidation";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";
import { unknownException } from "@shared/utils/domain/shared.errors";

@Injectable()
export class RealWalletRepository implements WalletRepository {
  constructor(private prisma: PrismaService) {}

  private baseValidator = validateFromUnknown(Wallet, "Wallet");

  private defaultErrorException = unknownException;

  private findMany = TE.tryCatchK(
    this.prisma.wallet.findMany.bind(this.prisma.wallet),
    this.defaultErrorException,
  );

  private findFirst = TE.tryCatchK(
    this.prisma.wallet.findFirst.bind(this.prisma.wallet),
    this.defaultErrorException,
  );
  private findUnique = TE.tryCatchK(
    this.prisma.wallet.findUnique.bind(this.prisma.wallet),
    this.defaultErrorException,
  );

  private count = TE.tryCatchK(
    this.prisma.wallet.count.bind(this.prisma.wallet),
    this.defaultErrorException,
  );

  private delete = TE.tryCatchK(
    this.prisma.wallet.delete.bind(this.prisma.wallet),
    this.defaultErrorException,
  );

  private upsert = TE.tryCatchK(
    this.prisma.wallet.upsert.bind(this.prisma.wallet),
    this.defaultErrorException,
  );

  private update = TE.tryCatchK(
    this.prisma.wallet.update.bind(this.prisma.wallet),
    this.defaultErrorException,
  );

  private includeAll: Prisma.WalletInclude = {};

  findAll = (): TE.TaskEither<Error, Wallet[]> => {
    return FPF.pipe(
      this.findMany({
        include: this.includeAll,
      }),
      TE.chainEitherK(validateRows(this.baseValidator)),
    );
  };

  findAllPaginated = (
    params: PaginatedQueryParams,
  ): TE.TaskEither<Error, Paginated<Wallet>> => {
    const where: Prisma.WalletWhereInput = {};
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

  findById = (walletId: string): TE.TaskEither<Error, O.Option<Wallet>> => {
    return FPF.pipe(
      this.findUnique({
        where: {
          id: walletId,
        },
        include: this.includeAll,
      }),
      TE.chainEitherK(validateMaybeRow(this.baseValidator)),
    );
  };

  deleteById = (walletId: string): TE.TaskEither<Error, void> => {
    return FPF.pipe(
      this.delete({
        where: {
          id: walletId,
        },
      }),
      TE.map(noop),
    );
  };

  save = (wallet: Wallet): TE.TaskEither<Error, void> => {
    return FPF.pipe(
      this.upsert({
        where: {
          id: wallet.id,
        },
        update: {
          btc: { increment: wallet.btc },
          usd: { increment: wallet.usd },
        },
        create: {
          ...wallet,
        },
      }),

      TE.map(noop),
    );
  };
}
