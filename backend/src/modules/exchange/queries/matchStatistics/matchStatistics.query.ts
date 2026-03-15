import { IQuery, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { executeTask } from "@shared/utils/application/executeTask";
import { FPF } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { MatchRepository } from "@src/modules/exchange/database/match.repository.port";
import { MatchStatistics } from "@src/modules/exchange/domain/match.entity";
import { PinoLogger } from "nestjs-pino";

export class MatchStatisticsQuery implements IQuery {}

@QueryHandler(MatchStatisticsQuery)
export class MatchStatisticsQueryHandler implements IQueryHandler<
  MatchStatisticsQuery,
  MatchStatistics
> {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("MatchStatistics");
  }

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(_: MatchStatisticsQuery): Promise<MatchStatistics> {
    const task = FPF.pipe(
      null,
      performRTE(this.matchRepository.getStatistics, "get match statistics."),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
