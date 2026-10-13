import { FakeMatchRepository } from "@exchange/database/fakeMatch.repository";
import { MatchRepository } from "@exchange/database/match.repository.port";
import {
  MatchStatisticsQuery,
  MatchStatisticsQueryHandler,
} from "@exchange/queries/matchStatistics/matchStatistics.query";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { MatchBuilder } from "@test/data-builders/matchBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";

describe("[Unit] Match Statistics", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        MatchStatisticsQueryHandler,
        { provide: MatchRepository, useClass: FakeMatchRepository },
      ],
    },
    (ref) => ({
      matchRepository: ref.get(MatchRepository),
      matchStatisticsQueryHandler: ref.get(MatchStatisticsQueryHandler),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should get match if he exists", async () => {
    //Given a valid query
    const query = new MatchStatisticsQuery();

    //With matchs in database
    const match = new MatchBuilder().build();
    await executeTask(modRef.r.matchRepository.save(match));

    //When we get match id
    const result = await modRef.r.matchStatisticsQueryHandler.execute(query);
    //Then it should show his data
    expect(result).toMatchObject({
      usdVolume24h: match.volume,
      btcVolume24h: match.volume / match.price,
      lastPrice: match.price,
      high24h: match.price,
      low24h: match.price,
    });
  });

  it("Should get statistics if there isnt matches", async () => {
    //Given a valid query and no matchs in database

    const query = new MatchStatisticsQuery();

    //When we list matchs
    const result = await modRef.r.matchStatisticsQueryHandler.execute(query);
    //Then it should throw an MatchNotFoundException
    expect(result).toMatchObject({
      usdVolume24h: 0,
      btcVolume24h: 0,
      lastPrice: null,
      high24h: null,
      low24h: null,
    });
  });
});
