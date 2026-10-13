import {
  MATCH_CREATED,
  MatchCreatedEvent,
  SOCKET_MATCH_CREATED,
} from "@exchange/domain/events/matchCreated.event";
import { MatchStatistics } from "@exchange/domain/match.entity";
import { MatchStatisticsQuery } from "@exchange/queries/matchStatistics/matchStatistics.query";
import { Injectable } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";

@Injectable()
export class CreateMatchSubscriber {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  @OnEvent(MATCH_CREATED)
  async afterMatchCreatedEvent(_: MatchCreatedEvent["payload"]): Promise<void> {
    const result = await this.queryBus.execute<
      MatchStatisticsQuery,
      MatchStatistics
    >(new MatchStatisticsQuery());
    return executeTask(
      this.domainEventPublisher.publishEvent({
        eventKey: SOCKET_MATCH_CREATED,
        payload: result,
      }),
    );
  }
}
