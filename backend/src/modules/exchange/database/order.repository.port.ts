import { O, TE } from "@shared/utils/application/monads";
import {
  Paginated,
  RepositoryDefaultPort,
} from "@shared/utils/database/repository.port";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";
import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@src/modules/exchange/domain/order.entity";
import { UUID } from "@src/modules/shared/uuid/entities/uuid";
import z from "zod";

export const OrderFindQuery = z.object({
  userId: UUID.optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  status: z.enum(OrderStatusEnum).optional(),
  side: z.enum(OrderSideEnum).optional(),
});
export type OrderFindQuery = z.infer<typeof OrderFindQuery>;

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
}
