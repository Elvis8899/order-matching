import { Test } from "@nestjs/testing";
import { FakeLoggerService } from "@shared/logger/adapters/fake/FakeLogger.service";
import { executeTask } from "@shared/utils/application/executeTask";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import {
  PaginatedUsersQuery,
  PaginatedUsersQueryHandler,
} from "@user/queries/paginatedUsers/paginatedUsers.query";
import { PinoLogger } from "nestjs-pino";

//Adapters
let userRepository: UserRepository;

describe("[Unit] List Users", () => {
  let paginatedUsersQueryHandler: PaginatedUsersQueryHandler;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaginatedUsersQueryHandler,
        RealUUIDGeneratorService,
        { provide: UserRepository, useClass: FakeUserRepository },
        { provide: PinoLogger, useClass: FakeLoggerService },
      ],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    paginatedUsersQueryHandler = moduleRef.get<PaginatedUsersQueryHandler>(
      PaginatedUsersQueryHandler,
    );
  });

  it("Should list users if query is valid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 0;
    const query = new PaginatedUsersQuery({
      limit,
      page,
    });

    //With users in database
    const user = new UserBuilder().build();
    await executeTask(userRepository.save(user));

    //When we list users
    const result = await paginatedUsersQueryHandler.execute(query);
    //Then it should show a list of users
    expect(result.data.length).toBe(1);
    expect(result.data[0]).toStrictEqual(user);
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list users if page is invalid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 1;
    const query = new PaginatedUsersQuery({
      limit,
      page,
    });

    //With users in database
    const user = new UserBuilder().build();
    await executeTask(userRepository.save(user));

    //When we list users
    const result = await paginatedUsersQueryHandler.execute(query);
    //Then it should show a list of users
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list users if there isnt users", async () => {
    //Given a valid query and no users in database
    const limit = 10;
    const page = 0;
    const query = new PaginatedUsersQuery({
      limit,
      page,
    });

    //When we list users
    const result = await paginatedUsersQueryHandler.execute(query);
    //Then it should show an empty list
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(0);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });
});
