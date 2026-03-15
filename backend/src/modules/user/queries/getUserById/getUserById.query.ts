import { IQuery, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, RTE } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { UUID } from "@shared/uuid/entities/uuid";
import { UserRepository } from "@user/database/user.repository.port";
import { User } from "@user/domain/user.entity";
import { userNotFoundException } from "@user/domain/user.errors";
import { PinoLogger } from "nestjs-pino";

export class GetUserByIdQuery implements IQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdQueryHandler implements IQueryHandler<
  GetUserByIdQuery,
  User
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("GetUserById");
  }

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(query: GetUserByIdQuery): Promise<User> {
    const task = FPF.pipe(
      query.id,
      fromInputRE(UUID, "UUID"),
      RTE.fromReaderEither,
      RTE.chain(
        performRTE(this.userRepository.findById, "get user in storage system."),
      ),
      RTE.chainW(RTE.fromOption<Error>(userNotFoundException)),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
