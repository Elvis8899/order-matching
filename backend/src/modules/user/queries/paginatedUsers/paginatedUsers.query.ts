import { IQuery, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, RTE } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { Paginated } from "@shared/utils/database/repository.port";
import {
  PageRequest,
  PageRequestSchema,
} from "@shared/utils/domain/query.base";
import { UserRepository } from "@user/database/user.repository.port";
import { User } from "@user/domain/user.entity";
import { PinoLogger } from "nestjs-pino";

export class PaginatedUsersQuery implements IQuery {
  constructor(public readonly params: PageRequest) {}
}

@QueryHandler(PaginatedUsersQuery)
export class PaginatedUsersQueryHandler implements IQueryHandler<
  PaginatedUsersQuery,
  Paginated<User>
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("PaginatedUsers");
  }

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(query: PaginatedUsersQuery): Promise<Paginated<User>> {
    const task = FPF.pipe(
      query.params,
      fromInputRE(PageRequestSchema, "PaginatedUsersQuery"),
      RTE.fromReaderEither,
      RTE.chain(
        performRTE(
          this.userRepository.findAllPaginated,
          "get user list in storage system.",
        ),
      ),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
