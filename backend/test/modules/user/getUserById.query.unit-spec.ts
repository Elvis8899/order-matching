import { Test } from "@nestjs/testing";
import { FakeLoggerService } from "@shared/logger/adapters/fake/FakeLogger.service";
import { executeTask } from "@shared/utils/application/executeTask";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { UserNotFoundException } from "@user/domain/user.errors";
import {
  GetUserByIdQuery,
  GetUserByIdQueryHandler,
} from "@user/queries/getUserById/getUserById.query";
import { PinoLogger } from "nestjs-pino";

//Adapters
let userRepository: UserRepository;

describe("[Unit] List Users", () => {
  let getUserByIdQueryHandler: GetUserByIdQueryHandler;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetUserByIdQueryHandler,
        RealUUIDGeneratorService,
        { provide: UserRepository, useClass: FakeUserRepository },
        { provide: PinoLogger, useClass: FakeLoggerService },
      ],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    getUserByIdQueryHandler = moduleRef.get<GetUserByIdQueryHandler>(
      GetUserByIdQueryHandler,
    );
  });

  it("Should get user if he exists", async () => {
    //Given a valid query
    const user = new UserBuilder().build();

    const query = new GetUserByIdQuery(user.id);

    //With users in database
    await executeTask(userRepository.save(user));

    //When we get user id
    const result = await getUserByIdQueryHandler.execute(query);
    //Then it should show his data
    expect(result.id).toBe(user.id);
  });

  it("Shouldnt get user if id is invalid", async () => {
    //Given a valid query
    const query = new GetUserByIdQuery("00000000-0000-0000-0001-000000000000");

    //With users in database
    const user = new UserBuilder(1).build();
    await executeTask(userRepository.save(user));

    //When get user
    const resultPromise = getUserByIdQueryHandler.execute(query);
    //Then it should show a list of users

    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
  });

  it("Shouldnt get user if there isnt users", async () => {
    //Given a valid query and no users in database

    const user = new UserBuilder(1).build();
    const query = new GetUserByIdQuery(user.id);

    //When we list users
    const resultPromise = getUserByIdQueryHandler.execute(query);
    //Then it should throw an UserNotFoundException
    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
  });
});
