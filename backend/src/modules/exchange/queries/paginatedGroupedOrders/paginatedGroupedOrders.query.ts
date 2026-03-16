import {
  GroupedOrderQuery,
  OrderRepository,
} from "@exchange/database/order.repository.port";
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

export class PaginatedGroupedOrdersQuery implements IQuery {
  constructor(public readonly params: PageRequest & GroupedOrderQuery) {}
}

@QueryHandler(PaginatedGroupedOrdersQuery)
export class PaginatedGroupedOrdersQueryHandler implements IQueryHandler<
  PaginatedGroupedOrdersQuery,
  Paginated<unknown>
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
  async execute(
    query: PaginatedGroupedOrdersQuery,
  ): Promise<Paginated<unknown>> {
    const task = FPF.pipe(
      query.params,
      fromInputRE(PageRequestSchema, "PaginatedGroupedOrdersQuery"),
      RE.bind("query", () =>
        fromInputRE(
          GroupedOrderQuery,
          "GroupedOrderQuery",
        )({ side: query.params.side }),
      ),
      RTE.fromReaderEither,
      RTE.chain(
        performRTE(
          this.orderRepository.paginatedGroupedOrders,
          "get order list in storage system.",
        ),
      ),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
