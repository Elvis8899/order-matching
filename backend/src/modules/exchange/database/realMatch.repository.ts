import {
  MatchFindQuery,
  MatchRepository,
} from "@exchange/database/match.repository.port";
import { Match, MatchStatistics } from "@exchange/domain/match.entity";
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
import { Decimal, DecimalType } from "@shared/utils/domain/decimal";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";
import { unknownException } from "@shared/utils/domain/shared.errors";

@Injectable()
export class RealMatchRepository implements MatchRepository {
  constructor(private prisma: PrismaService) {}

  private baseValidator = validateFromUnknown(Match, "Match");

  private defaultErrorException = unknownException;

  private findMany = TE.tryCatchK(
    this.prisma.match.findMany.bind(this.prisma.match),
    this.defaultErrorException,
  );

  private findFirst = TE.tryCatchK(
    this.prisma.match.findFirst.bind(this.prisma.match),
    this.defaultErrorException,
  );
  private findUnique = TE.tryCatchK(
    this.prisma.match.findUnique.bind(this.prisma.match),
    this.defaultErrorException,
  );

  private count = TE.tryCatchK(
    this.prisma.match.count.bind(this.prisma.match),
    this.defaultErrorException,
  );

  private delete = TE.tryCatchK(
    this.prisma.match.delete.bind(this.prisma.match),
    this.defaultErrorException,
  );

  private upsert = TE.tryCatchK(
    this.prisma.match.upsert.bind(this.prisma.match),
    this.defaultErrorException,
  );

  private update = TE.tryCatchK(
    this.prisma.match.update.bind(this.prisma.match),
    this.defaultErrorException,
  );

  private aggregate = TE.tryCatchK(
    this.prisma.match.aggregate.bind(this.prisma.match),
    this.defaultErrorException,
  );
  queryToWhereInput = (query?: MatchFindQuery): Prisma.MatchWhereInput => {
    const where: Prisma.MatchWhereInput = {};
    const { userId, minDate } = query || {};
    if (userId) {
      where.OR = [{ buyUserId: userId }, { sellUserId: userId }];
    }
    if (minDate) {
      where.createdAt = { gte: minDate };
    }
    return where;
  };

  findAll = (params?: {
    query?: MatchFindQuery;
  }): TE.TaskEither<Error, Match[]> => {
    const where = this.queryToWhereInput(params?.query);
    return FPF.pipe(
      this.findMany({
        // include: this.includeAll,
        where,
      }),
      TE.chainEitherK(validateRows(this.baseValidator)),
    );
  };

  findAllPaginated = (
    params: PaginatedQueryParams<MatchFindQuery>,
  ): TE.TaskEither<Error, Paginated<Match>> => {
    const where = this.queryToWhereInput(params.query);
    return loadPage(
      {
        rows: ({ skip, take }) =>
          this.findMany({
            where: where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
          }),
        total: () => this.count({ where: where }),
      },
      validateRows(this.baseValidator),
    )(params);
  };

  findById = (matchId: string): TE.TaskEither<Error, O.Option<Match>> => {
    return FPF.pipe(
      this.findUnique({
        where: {
          id: matchId,
        },
        // include: this.includeAll,
      }),
      TE.chainEitherK(validateMaybeRow(this.baseValidator)),
    );
  };

  deleteById = (matchId: string): TE.TaskEither<Error, void> => {
    return FPF.pipe(
      this.delete({
        where: {
          id: matchId,
        },
      }),
      TE.map(noop),
    );
  };

  save = (match: Match): TE.TaskEither<Error, void> => {
    return FPF.pipe(
      this.upsert({
        where: {
          id: match.id,
        },
        update: {},
        create: {
          ...match,
        },
      }),

      TE.map(noop),
    );
  };
  getStatistics: () => TE.TaskEither<Error, MatchStatistics> = () => {
    const aggregate = this.aggregate({
      _min: { price: true },
      _max: { price: true },
      _sum: { volume: true },
      where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    // Each match's volume is its BTC amount times its price, so this sums
    // the BTC amounts exactly
    const btcVolume = TE.tryCatchK(
      () =>
        this.prisma.$queryRaw<
          [{ btcVolume: Prisma.Decimal | null }]
        >`select sum(volume / price) as "btcVolume" from "Match" where "createdAt" > now() - interval '24 hours'`,
      this.defaultErrorException,
    );
    const toDecimal = (value: Prisma.Decimal | null) =>
      value === null ? null : DecimalType.parse(value);
    return FPF.pipe(
      aggregate,
      TE.bindTo("aggregate"),
      TE.bind("btc", btcVolume),
      TE.bind("findFirst", () =>
        this.findFirst({ orderBy: { createdAt: "desc" } }),
      ),
      TE.map((data) => {
        return {
          usdVolume24h: toDecimal(data.aggregate._sum.volume) ?? new Decimal(0),
          btcVolume24h: toDecimal(data.btc[0].btcVolume) ?? new Decimal(0),
          lastPrice: toDecimal(data.findFirst?.price ?? null),
          high24h: toDecimal(data.aggregate._max.price),
          low24h: toDecimal(data.aggregate._min.price),
        };
      }),
    );
  };
}
