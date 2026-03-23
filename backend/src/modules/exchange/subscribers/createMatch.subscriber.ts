import { Injectable } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";
import {
  MATCH_CREATED,
  MatchCreatedEvent,
  SOCKET_MATCH_CREATED,
} from "@src/modules/exchange/domain/events/matchCreated.event";
import { MatchStatistics } from "@src/modules/exchange/domain/match.entity";
import { MatchStatisticsQuery } from "@src/modules/exchange/queries/matchStatistics/matchStatistics.query";
import { DomainEventPublisher } from "@src/modules/shared/domain-event-publisher/adapters/domainEventPublisher";
import { executeTask } from "@src/modules/shared/utils/application/executeTask";

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
