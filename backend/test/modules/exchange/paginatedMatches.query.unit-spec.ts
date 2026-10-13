import { FakeMatchRepository } from "@exchange/database/fakeMatch.repository";
import { MatchRepository } from "@exchange/database/match.repository.port";
import {
  PaginatedMatchesQuery,
  PaginatedMatchesQueryHandler,
} from "@exchange/queries/paginatedMatches/paginatedMatches.query";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import {
  executeTask,
  executeTasks,
} from "@shared/utils/application/executeTask";
import { MatchBuilder } from "@test/data-builders/matchBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";

describe("[Unit] List Matches", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        PaginatedMatchesQueryHandler,
        { provide: MatchRepository, useClass: FakeMatchRepository },
      ],
    },
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

  it("Should list matches if query is valid", async () => {
    //Given a valid query
    const limit = 1;
    const page = 1;
    const query = new PaginatedMatchesQuery({
      limit,
      page,
    });

    //With matches in database
    const matchA = new MatchBuilder().build();
    const matchB = new MatchBuilder(1).build();
    await executeTasks(
      modRef.r.matchRepository.save(matchA),
      modRef.r.matchRepository.save(matchB),
    );

    //When we list matches
    const result = await modRef.r.paginatedMatchesQueryHandler.execute(query);
    //Then it should show a list of matches
    expect(result.data.length).toBe(1);
    expect(result.data[0]).toStrictEqual(matchB);
    expect(result.count).toBe(2);
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
  //

  it("Query should work as expected", async () => {
    //With match in database
    const match = new MatchBuilder().build();
    await executeTask(modRef.r.matchRepository.save(match));

    //When we try to retrieve with queries that wouldn't find anything
    const resultEmpty = await executeTasks(
      modRef.r.matchRepository.findAll({
        query: { minDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }),
      modRef.r.matchRepository.findAll({
        query: { userId: createTestId(TableNameEnum.None, 0) },
      }),
    );

    // Or queries that would find something
    const resultNonEmpty = await executeTasks(
      modRef.r.matchRepository.findAll(),
      modRef.r.matchRepository.findAll({
        query: { minDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      modRef.r.matchRepository.findAll({
        query: { userId: match.buyUserId },
      }),
      modRef.r.matchRepository.findAll({
        query: { userId: match.sellUserId },
      }),
      modRef.r.matchRepository.findAll({
        query: {
          userId: match.sellUserId,
          minDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      }),
    );
    resultEmpty.forEach((res) => {
      expect(res.length).toBe(0);
    });
    resultNonEmpty.forEach((res) => {
      expect(res.length).toBe(1);
    });
  });
});
