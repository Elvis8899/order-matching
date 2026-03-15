import {
  GroupedOrderQuery,
  OrderFindQuery,
  OrderRepository,
} from "@exchange/database/order.repository.port";
import {
  GroupedOrder,
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@exchange/domain/order.entity";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { E, FPF, O, TE } from "@shared/utils/application/monads";
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
export class RealOrderRepository implements OrderRepository {
  constructor(private prisma: PrismaService) {}

  private baseValidator = validateFromUnknown(Order, "Order");

  private defaultErrorException = unknownException;

  private findMany = TE.tryCatchK(
    this.prisma.order.findMany.bind(this.prisma.order),
    this.defaultErrorException,
  );

  private findFirst = TE.tryCatchK(
    this.prisma.order.findFirst.bind(this.prisma.order),
    this.defaultErrorException,
  );
  private findUnique = TE.tryCatchK(
    this.prisma.order.findUnique.bind(this.prisma.order),
    this.defaultErrorException,
  );

  private count = TE.tryCatchK(
    this.prisma.order.count.bind(this.prisma.order),
    this.defaultErrorException,
  );

  private delete = TE.tryCatchK(
    this.prisma.order.delete.bind(this.prisma.order),
    this.defaultErrorException,
  );

  private upsert = TE.tryCatchK(
    this.prisma.order.upsert.bind(this.prisma.order),
    this.defaultErrorException,
  );

  private update = TE.tryCatchK(
    this.prisma.order.update.bind(this.prisma.order),
    this.defaultErrorException,
  );

  queryToWhereInput = (query?: OrderFindQuery): Prisma.OrderWhereInput => {
    const where: Prisma.OrderWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    }
    if (query?.side) {
      where.side = query.side;
    }
    if (query?.minPrice !== undefined || query?.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    if (query?.maxDate) {
      where.createdAt = {
        lte: query.maxDate,
      };
    }

    if (query?.userId) {
      where.userId = query.userId;
    }

    return where;
  };

  private includeAll: Prisma.OrderInclude = {};

  findAll = (params?: {
    query?: OrderFindQuery;
  }): TE.TaskEither<Error, Order[]> => {
    const where = this.queryToWhereInput(params?.query);
    return FPF.pipe(
      this.findMany({
        where,
        include: this.includeAll,
      }),
      TE.chainEitherK(validateRows(this.baseValidator)),
    );
  };

  findAllPaginated = (
    params: PaginatedQueryParams<OrderFindQuery>,
  ): TE.TaskEither<Error, Paginated<Order>> => {
    const where = this.queryToWhereInput(params.query);
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

  findById = (orderId: string): TE.TaskEither<Error, O.Option<Order>> => {
    return FPF.pipe(
      this.findUnique({
        where: {
          id: orderId,
        },
        include: this.includeAll,
      }),
      TE.chainEitherK(validateMaybeRow(this.baseValidator)),
    );
  };

  deleteById = (orderId: string): TE.TaskEither<Error, void> => {
    return FPF.pipe(
      this.delete({
        where: {
          id: orderId,
        },
      }),
      TE.map(noop),
    );
  };

  save = (order: Order): TE.TaskEither<Error, void> => {
    return FPF.pipe(
      this.upsert({
        where: {
          id: order.id,
        },
        update: {
          status: order.status,
          filled: order.filled,
        },
        create: {
          ...order,
        },
      }),

      TE.map(noop),
    );
  };

  /** Active orders of one side, summed per price level (best price first). */
  paginatedGroupedOrders = (
    params: PaginatedQueryParams<GroupedOrderQuery>,
  ): TE.TaskEither<Error, Paginated<GroupedOrder>> => {
    const { side } = params.query;
    // Prisma reports a sum over no rows as null
    const sumOf = (value: number | null) => value || 0;
    const remaining = (sum: { amount: number | null; filled: number | null }) =>
      sumOf(sum.amount) - sumOf(sum.filled);
    const levels = TE.tryCatchK(
      (skip: number, take: number) =>
        this.prisma.order.groupBy({
          by: ["price"],
          _sum: { amount: true, filled: true },
          where: { side, status: OrderStatusEnum.Active },
          orderBy: { price: side === OrderSideEnum.Buy ? "desc" : "asc" },
          skip,
          take,
        }),
      this.defaultErrorException,
    );
    const levelCount = TE.tryCatchK(
      () =>
        this.prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(DISTINCT "price")::int AS count
          FROM "Order"
          WHERE "side" = ${side}::"OrderSide"
            AND "status" = ${OrderStatusEnum.Active}::"OrderStatus";`,
      this.defaultErrorException,
    );
    return loadPage(
      {
        rows: ({ skip, take }) => levels(skip, take),
        total: () =>
          FPF.pipe(
            levelCount(),
            TE.map(([row]) => row.count),
          ),
      },
      (rows): E.Either<Error, GroupedOrder[]> =>
        E.right(
          rows.map(({ price, _sum }) => ({
            price,
            amount: remaining(_sum),
            volume: price * remaining(_sum),
          })),
        ),
    )(params);
  };
}
