import { InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import {
  executeTask,
  executeTasks,
} from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { IntegrationModule } from "@test/util/defaultModule.inte";
import { TestHelper } from "@test/util/testHelper";
import { RealUserRepository } from "@user/database/realUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

const inteM = new IntegrationModule(
  [PrismaService, { provide: UserRepository, useClass: RealUserRepository }],
  (app) => ({
    userRepository: app.get(UserRepository),
    prismaService: app.get(PrismaService),
  }),
);
beforeAll(async () => {
  await inteM.init();
});

afterAll(async () => {
  await inteM.r.prismaService.$disconnect();
});

describe("[Integration] User repository", () => {
  const userBuilder = new UserBuilder();

  beforeEach(async () => {
    await inteM.r.prismaService.user.deleteMany();
  });

  afterEach(async () => {
    await inteM.r.prismaService.user.deleteMany();
    userBuilder.reset();
  });

  it("Successfully get user after save", async () => {
    //Given an existing user in database

    const user = userBuilder.build();
    await executeTask(inteM.r.userRepository.save(user));

    // Should be able to retrieve it

    const [resultById, resultByUsername, resultPaginated, resultAll] =
      await executeTasks(
        inteM.r.userRepository.findById(user.id),
        inteM.r.userRepository.findByUsername(user.username),
        inteM.r.userRepository.findAllPaginated({
          page: 0,
          limit: 10,
        }),
        inteM.r.userRepository.findAll(),
      );

    const expectSomeUser = TestHelper.expectSome(user);

    expectSomeUser(resultById);
    expectSomeUser(resultByUsername);
    expect(resultPaginated.count).toBe(1);
    expect(resultPaginated.data.length).toBe(1);
    expect(resultAll.length).toBe(1);
  });

  it("Successfully delete user after save", async () => {
    //Given an inexisting user in database
    const user = userBuilder
      .withId(createTestId(TableNameEnum.None, 0))
      .build();

    await executeTask(inteM.r.userRepository.save(user));

    //When we delete him

    await executeTask(inteM.r.userRepository.deleteById(user.id));
    //Then we should have deleted him
    const savedUsers = await inteM.r.prismaService.user.findMany({});

    expect(savedUsers.length).toBe(0);
  });

  it("Should not delete user with wrong id", async () => {
    //Given an existing user in database
    const user = userBuilder
      .withId(createTestId(TableNameEnum.None, 0))
      .build();

    await executeTask(inteM.r.userRepository.save(user));

    const unsavedUser = userBuilder.reset().build();

    //When we try deleting an user with wrong id

    const resultPromise = executeTask(
      inteM.r.userRepository.deleteById(unsavedUser.id),
    );
    //Then we should not have deleted him
    await expect(resultPromise).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    const savedUsers = await inteM.r.prismaService.user.findMany({});

    expect(savedUsers.length).toBe(1);
  });

  it("Return null when there is no user", async () => {
    //Given no existing users in database
    const unsavedUser = userBuilder
      .withId(createTestId(TableNameEnum.None, 0))
      .build();

    //When we try to retrieve
    const [resultById, resultByUsername, resultPaginated, resultAll] =
      await executeTasks(
        inteM.r.userRepository.findById(unsavedUser.id),
        inteM.r.userRepository.findByUsername(unsavedUser.username),
        inteM.r.userRepository.findAllPaginated({
          page: 0,
          limit: 10,
        }),
        inteM.r.userRepository.findAll(),
      );

    TestHelper.expectNone(resultById);
    TestHelper.expectNone(resultByUsername);
    expect(resultPaginated.count).toBe(0);
    expect(resultPaginated.data.length).toBe(0);
    expect(resultAll.length).toBe(0);
  });
});
