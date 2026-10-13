import { FakeMatchRepository } from "@exchange/database/fakeMatch.repository";
import { FakeWalletRepository } from "@exchange/database/fakeWallet.repository";
import { MatchRepository } from "@exchange/database/match.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import {
  MATCH_CREATED,
  MatchCreatedEvent,
} from "@exchange/domain/events/matchCreated.event";
import { MatchStatisticsQueryHandler } from "@exchange/queries/matchStatistics/matchStatistics.query";
import { CreateMatchSubscriber } from "@exchange/subscribers/createMatch.subscriber";
import { CqrsModule } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { MatchBuilder } from "@test/data-builders/matchBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";

describe("[Unit] Endpoint Response - Subscriber", () => {
  const modRef = new UnitModule(
    {
      imports: [CqrsModule, DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        MatchStatisticsQueryHandler,
        CreateMatchSubscriber,
        { provide: MatchRepository, useClass: FakeMatchRepository },
        { provide: WalletRepository, useClass: FakeWalletRepository },
      ],
    },
    (ref) => ({
      walletRepository: ref.get(WalletRepository),
      matchRepository: ref.get(MatchRepository),
      eventPublisher: ref.get(DomainEventPublisher),
      createMatchSubscriber: ref.get(CreateMatchSubscriber),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should not return error", async () => {
    // Given a valid saved match
    const match = new MatchBuilder().build();
    await executeTask(modRef.r.matchRepository.save(match));

    const spy = jest.spyOn(modRef.r.eventPublisher, "publishEvent");
    // And a valid event
    const responseWatcherEvent = MatchCreatedEvent.parse({
      eventKey: MATCH_CREATED,
      payload: {
        ids: [match.id],
        userIds: [match.buyUserId, match.sellUserId],
      },
    });
    //When the function is called
    const resultPromise = modRef.r.createMatchSubscriber.afterMatchCreatedEvent(
      responseWatcherEvent.payload,
    );

    //Then it should resolve to undefined
    await expect(resultPromise).resolves.toBe(undefined);

    //Then it should have emitted an event
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
