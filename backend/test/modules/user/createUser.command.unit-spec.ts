import { UnprocessableEntityException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { FakeLoggerService } from "@shared/logger/adapters/fake/FakeLogger.service";
import { executeTask } from "@shared/utils/application/executeTask";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UserBuilder } from "@test/data-builders/userBuilder";
import {
  CreateUser,
  CreateUserHandler,
} from "@user/commands/createUser/createUser.command";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { UserCPFAlreadyExistsException } from "@user/domain/user.errors";
import { PinoLogger } from "nestjs-pino";

//Adapters
let userRepository: UserRepository;
let eventUser: DomainEventPublisher;

describe("[Unit] Create User", () => {
  let createUserHandler: CreateUserHandler;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DomainEventPublisherModule],
      providers: [
        {
          provide: DomainEventPublisherModule,
          useClass: DomainEventPublisher,
        },
        CreateUserHandler,
        RealUUIDGeneratorService,
        { provide: UserRepository, useClass: FakeUserRepository },
        { provide: PinoLogger, useClass: FakeLoggerService },
      ],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    createUserHandler = moduleRef.get<CreateUserHandler>(CreateUserHandler);
    eventUser = moduleRef.get<DomainEventPublisher>(DomainEventPublisher);
  });

  it("Should create user if user is valid", async () => {
    //Given a potentially valid user
    const user = new UserBuilder().buildCreateDTO();

    //When we create a user
    const resultPromise = createUserHandler.execute(new CreateUser(user));

    //Then it should have created a user
    await expect(resultPromise).resolves.toEqual(undefined);

    const users = await executeTask(userRepository.findAll());
    expect(users.length).toEqual(1);
  });

  it("Should create user without optional keys", async () => {
    //Given a potentially valid name

    const user = new UserBuilder().buildCreateDTO();
    //When we create a user
    const resultPromise = createUserHandler.execute(new CreateUser(user));

    //Then it should have created a user
    await expect(resultPromise).resolves.toEqual(undefined);

    const users = await executeTask(userRepository.findAll());
    expect(users.length).toEqual(1);
  });

  it("Should emit domain event when user is created", async () => {
    //Given a potentially valid name

    const spy = jest.spyOn(eventUser, "publishEvent");

    const user = new UserBuilder().buildCreateDTO();
    //When we create a user
    await createUserHandler.execute(new CreateUser(user));

    //Then it should have created a user and emitted an event
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("Should not create a user if name is invalid", async () => {
    //Given a potentially invalid name
    const user = new UserBuilder().withUsername("").buildCreateDTO();
    //When we create a user
    const resultPromise = createUserHandler.execute(new CreateUser(user));

    //Then it should have thrown an error and not have created a user
    await expect(resultPromise).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );

    const users = await executeTask(userRepository.findAll());
    expect(users.length).toEqual(0);
  });

  it("Should not create a user if username already exists", async () => {
    //Given an existing user
    const user = new UserBuilder().buildCreateDTO();
    const username = user.username;
    //When we create two users with the same name
    await createUserHandler.execute(new CreateUser(user));
    const userCopy = new UserBuilder().withUsername(username).buildCreateDTO();
    const resultPromise = createUserHandler.execute(new CreateUser(userCopy));
    await expect(resultPromise).rejects.toBeInstanceOf(
      UserCPFAlreadyExistsException,
    );
  });
});
