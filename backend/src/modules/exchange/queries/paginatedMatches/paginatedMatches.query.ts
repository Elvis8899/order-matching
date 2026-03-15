import {
  MatchFindQuery,
  MatchRepository,
} from "@exchange/database/match.repository.port";
import { Match } from "@exchange/domain/match.entity";
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

export class PaginatedMatchesQuery implements IQuery {
  constructor(public readonly params: PageRequest & { userId?: string }) {}
}

@QueryHandler(PaginatedMatchesQuery)
export class PaginatedMatchesQueryHandler implements IQueryHandler<
  PaginatedMatchesQuery,
  Paginated<Match>
> {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("PaginatedMatches");
  }

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(query: PaginatedMatchesQuery): Promise<Paginated<Match>> {
    const task = FPF.pipe(
      query.params,
      fromInputRE(PageRequestSchema, "PaginatedMatchesQuery"),
      RE.bind("query", () =>
        fromInputRE(
          MatchFindQuery,
          "MatchFindQuery",
        )({ userId: query.params.userId }),
      ),
      RTE.fromReaderEither,
      RTE.chain(
        performRTE(
          this.matchRepository.findAllPaginated,
          "get match list in storage system.",
        ),
      ),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
