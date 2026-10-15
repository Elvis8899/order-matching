import { MatchRepository } from "@exchange/database/match.repository.port";
import { RealMatchRepository } from "@exchange/database/realMatch.repository";
import { InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import {
  executeTask,
  executeTasks,
} from "@shared/utils/application/executeTask";
import { Decimal } from "@shared/utils/domain/decimal";
import { MatchBuilder } from "@test/dataBuilders/matchBuilder";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { IntegrationModule } from "@test/util/defaultModule.inte";
import { TestHelper } from "@test/util/testHelper";
import { RealUserRepository } from "@user/database/realUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

const inteM = new IntegrationModule(
  [
    PrismaService,
    { provide: UserRepository, useClass: RealUserRepository },
    { provide: MatchRepository, useClass: RealMatchRepository },
  ],
  (app) => ({
    userRepository: app.get(UserRepository),
    prismaService: app.get(PrismaService),
    matchRepository: app.get(MatchRepository),
  }),
);
beforeAll(async () => {
  await inteM.init();
  await executeTask(inteM.r.userRepository.save(new UserBuilder().build()));
});

afterAll(async () => {
  await inteM.r.prismaService.$disconnect();
});

describe("[Integration] Match repository", () => {
  const matchBuilder = new MatchBuilder();

  beforeEach(async () => {
    await inteM.r.prismaService.match.deleteMany();
  });

  afterEach(async () => {
    await inteM.r.prismaService.match.deleteMany();
    matchBuilder.reset();
  });

  it("Successfully get match after save", async () => {
    //Given an existing match in database

    const match = matchBuilder.build();
    await executeTask(inteM.r.matchRepository.save(match));

    // Should be able to retrieve it

    const [resultById, resultPaginated, resultAll] = await executeTasks(
      inteM.r.matchRepository.findById(match.id),
      inteM.r.matchRepository.findAllPaginated({
        page: 0,
        limit: 10,
        query: { userId: match.buyUserId },
      }),
      inteM.r.matchRepository.findAll(),
    );

    const expectSomeMatch = TestHelper.expectSome(match);

    expectSomeMatch(resultById);
    expect(resultPaginated.count).toBe(1);
    expect(resultPaginated.data.length).toBe(1);
    expect(resultAll.length).toBe(1);
  });

  it("Successfully delete match after save", async () => {
    //Given an inexisting match in database
    const match = matchBuilder.build();

    await executeTask(inteM.r.matchRepository.save(match));

    //When we delete him

    await executeTask(inteM.r.matchRepository.deleteById(match.id));
    //Then we should have deleted him
    const savedMatchs = await inteM.r.prismaService.match.findMany({});

    expect(savedMatchs.length).toBe(0);
  });

  it("Should not delete match with wrong id", async () => {
    //Given an existing match in database
    const match = matchBuilder.build();

    await executeTask(inteM.r.matchRepository.save(match));

    //When we try deleting with wrong match id

    const resultPromise = executeTask(
      inteM.r.matchRepository.deleteById(createTestId(TableNameEnum.None, 0)),
    );
    //Then we should not have deleted him
    await expect(resultPromise).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    const savedMatchs = await inteM.r.prismaService.match.findMany({});

    expect(savedMatchs.length).toBe(1);
  });

  it("Return null when there is no match - nothing in database", async () => {
    //Given no existing matchs in database

    //When we try to retrieve
    const [resultById, resultPaginated, resultAll] = await executeTasks(
      inteM.r.matchRepository.findById(createTestId(TableNameEnum.None, 0)),
      inteM.r.matchRepository.findAllPaginated({
        page: 0,
        limit: 10,
        query: {},
      }),
      inteM.r.matchRepository.findAll(),
    );

    TestHelper.expectNone(resultById);
    expect(resultPaginated.count).toBe(0);
    expect(resultPaginated.data.length).toBe(0);
    expect(resultAll.length).toBe(0);
  });

  it("Return null when there is no match - query", async () => {
    //Given a existing match in database
    const match = matchBuilder.build();
    await executeTask(inteM.r.matchRepository.save(match));

    //When we try to retrieve
    const [resultById, resultPaginated, resultAll] = await executeTasks(
      inteM.r.matchRepository.findById(createTestId(TableNameEnum.None, 0)),
      inteM.r.matchRepository.findAllPaginated({
        page: 0,
        limit: 10,
        query: { minDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }),
      inteM.r.matchRepository.findAll({
        query: { minDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }),
    );

    TestHelper.expectNone(resultById);
    expect(resultPaginated.count).toBe(0);
    expect(resultPaginated.data.length).toBe(0);
    expect(resultAll.length).toBe(0);
  });

  it("Successfully get match statistics after save", async () => {
    //Given an existing match in database

    const match = matchBuilder.build();
    await executeTask(inteM.r.matchRepository.save(match));

    // Should be able to retrieve it

    const result = await executeTask(inteM.r.matchRepository.getStatistics());

    expect(result).toMatchObject({
      usdVolume24h: match.volume,
      btcVolume24h: match.volume.div(match.price),
      lastPrice: match.price,
      high24h: match.price,
      low24h: match.price,
    });
  });

  it("Successfully get match statistics with no match", async () => {
    //Given no existing match in database

    // Should be able to retrieve it

    const result = await executeTask(inteM.r.matchRepository.getStatistics());

    expect(result).toMatchObject({
      usdVolume24h: new Decimal(0),
      btcVolume24h: new Decimal(0),
      lastPrice: null,
      high24h: null,
      low24h: null,
    });
  });
});
