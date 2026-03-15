import { Injectable } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";
import { MATCH_CREATED } from "@src/modules/exchange/domain/events/matchCreated.event";
import { POST_STATISTICS } from "@src/modules/exchange/domain/events/postStatistics.event";
import { MatchStatistics } from "@src/modules/exchange/domain/match.entity";
import { MatchStatisticsQuery } from "@src/modules/exchange/queries/matchStatistics/matchStatistics.query";
import { DomainEventPublisher } from "@src/modules/shared/domain-event-publisher/adapters/domainEventPublisher";
import { executeTask } from "@src/modules/shared/utils/application/executeTask";

@Injectable()
export class MatchCreatedSubscriber {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  @OnEvent(MATCH_CREATED)
  async afterMatchCreatedEvent(): Promise<void> {
    const result = await this.queryBus.execute<
      MatchStatisticsQuery,
      MatchStatistics
    >(new MatchStatisticsQuery());
    return executeTask(
      this.domainEventPublisher.publishEvent({
        eventKey: POST_STATISTICS,
        payload: result,
      }),
    );
  }
}
