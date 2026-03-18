import { Test } from "@nestjs/testing";
import { executeTask } from "@shared/utils/application/executeTask";
import { FakeMatchRepository } from "@src/modules/exchange/database/fakeMatch.repository";
import { MatchRepository } from "@src/modules/exchange/database/match.repository.port";
import {
  PaginatedMatchesQuery,
  PaginatedMatchesQueryHandler,
} from "@src/modules/exchange/queries/paginatedMatches/paginatedMatches.query";
import { DomainEventPublisherModule } from "@src/modules/shared/domain-event-publisher/domainEventPublisher.module";
import { MatchBuilder } from "@test/data-builders/matchBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import { TestHelper } from "@test/util/testHelper";

describe("[Unit] List Matches", () => {
  const modRef = new UnitModule(
    Test.createTestingModule({
      imports: [DomainEventPublisherModule],
      providers: [
        ...TestHelper.unitDefaultProviders,
        PaginatedMatchesQueryHandler,
        { provide: MatchRepository, useClass: FakeMatchRepository },
      ],
    }),
    (ref) => ({
      matchRepository: ref.get(MatchRepository),
      paginatedMatchesQueryHandler: ref.get(PaginatedMatchesQueryHandler),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should list matches if query is valid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 0;
    const query = new PaginatedMatchesQuery({
      limit,
      page,
    });

    //With matches in database
    const match = new MatchBuilder().build();
    await executeTask(modRef.r.matchRepository.save(match));

    //When we list matches
    const result = await modRef.r.paginatedMatchesQueryHandler.execute(query);
    //Then it should show a list of matches
    expect(result.data.length).toBe(1);
    expect(result.data[0]).toStrictEqual(match);
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list matches if page is invalid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 1;
    const query = new PaginatedMatchesQuery({
      limit,
      page,
    });

    //With matches in database
    const match = new MatchBuilder().build();
    await executeTask(modRef.r.matchRepository.save(match));

    //When we list matches
    const result = await modRef.r.paginatedMatchesQueryHandler.execute(query);
    //Then it should show a list of matches
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list matches if there isnt matches", async () => {
    //Given a valid query and no matches in database
    const limit = 10;
    const page = 0;
    const query = new PaginatedMatchesQuery({
      limit,
      page,
    });

    //When we list matches
    const result = await modRef.r.paginatedMatchesQueryHandler.execute(query);
    //Then it should show an empty list
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(0);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });
});
