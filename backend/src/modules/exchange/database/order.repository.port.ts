import {
  GroupedOrder,
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@exchange/domain/order.entity";
import { O, TE } from "@shared/utils/application/monads";
import {
  Paginated,
  RepositoryDefaultPort,
} from "@shared/utils/database/repository.port";
import { DateType } from "@shared/utils/domain/dateType";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";
import { UUID } from "@shared/uuid/entities/uuid";
import z from "zod";

export const OrderFindQuery = z.object({
  userId: UUID.optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  status: z.enum(OrderStatusEnum).optional(),
  side: z.enum(OrderSideEnum).optional(),
  maxDate: DateType.optional(),
});
export type OrderFindQuery = z.infer<typeof OrderFindQuery>;

export const GroupedOrderQuery = z.object({
  side: z.enum(OrderSideEnum),
});
export type GroupedOrderQuery = z.infer<typeof GroupedOrderQuery>;

export abstract class OrderRepository implements RepositoryDefaultPort<Order> {
  findById!: (id: string) => TE.TaskEither<Error, O.Option<Order>>;
  findAll!: (param?: {
    query?: OrderFindQuery;
  }) => TE.TaskEither<Error, Order[]>;
  findAllPaginated!: (
    params: PaginatedQueryParams<OrderFindQuery>,
  ) => TE.TaskEither<Error, Paginated<Order>>;
  deleteById!: (id: string) => TE.TaskEither<Error, void>;
  save!: (order: Order) => TE.TaskEither<Error, void>;
  //
  paginatedGroupedOrders!: (
    params: PaginatedQueryParams<GroupedOrderQuery>,
  ) => TE.TaskEither<Error, Paginated<GroupedOrder>>;
}
