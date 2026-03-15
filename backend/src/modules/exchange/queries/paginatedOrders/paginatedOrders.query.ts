import {
  OrderFindQuery,
  OrderRepository,
} from "@exchange/database/order.repository.port";
import { Order, OrderStatusEnum } from "@exchange/domain/order.entity";
import { IQuery, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, RE, RTE } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { Paginated } from "@shared/utils/database/repository.port";
import {
  PageRequest,
  PageRequestSchema,
} from "@shared/utils/domain/query.base";
import { PinoLogger } from "nestjs-pino";

export class PaginatedOrdersQuery implements IQuery {
  constructor(public readonly params: PageRequest & { userId?: string }) {}
}

@QueryHandler(PaginatedOrdersQuery)
export class PaginatedOrdersQueryHandler implements IQueryHandler<
  PaginatedOrdersQuery,
  Paginated<Order>
> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("PaginatedOrders");
  }

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(query: PaginatedOrdersQuery): Promise<Paginated<Order>> {
    const task = FPF.pipe(
      query.params,
      fromInputRE(PageRequestSchema, "PaginatedOrdersQuery"),
      RE.bind("query", () =>
        fromInputRE(
          OrderFindQuery,
          "OrderFindQuery",
        )({ userId: query.params.userId, status: OrderStatusEnum.Active }),
      ),
      RTE.fromReaderEither,
      RTE.chain(
        performRTE(
          this.orderRepository.findAllPaginated,
          "get order list in storage system.",
        ),
      ),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
