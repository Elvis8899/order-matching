import { UnprocessableEntityException } from "@nestjs/common";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import {
  CreateUser,
  CreateUserHandler,
} from "@user/commands/createUser/createUser.command";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { UsernameAlreadyExistsException } from "@user/domain/user.errors";

//Adapters

describe("[Unit] Create User", () => {
  const moduleRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        CreateUserHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
      ],
    },
    (app) => ({
      userRepository: app.get(UserRepository),
      createUserHandler: app.get(CreateUserHandler),
      eventPublisher: app.get(DomainEventPublisher),
    }),
  );
  beforeEach(async () => {
    await moduleRef.init();
  });

  it("Should create user if user is valid", async () => {
    //Given a potentially valid user
    const user = new UserBuilder().buildCreateDTO();

    //When we create a user
    const resultPromise = moduleRef.r.createUserHandler.execute(
      new CreateUser(user),
    );

    //Then it should have created a user
    await expect(resultPromise).resolves.toEqual(undefined);

    const users = await executeTask(moduleRef.r.userRepository.findAll());
    expect(users.length).toEqual(1);
  });

  it("Should create user without optional keys", async () => {
    //Given a potentially valid name

    const user = new UserBuilder().buildCreateDTO();
    //When we create a user
    const resultPromise = moduleRef.r.createUserHandler.execute(
      new CreateUser(user),
    );

    //Then it should have created a user
    await expect(resultPromise).resolves.toEqual(undefined);

    const users = await executeTask(moduleRef.r.userRepository.findAll());
    expect(users.length).toEqual(1);
  });

  it("Should emit domain event when user is created", async () => {
    //Given a potentially valid name

    const spy = jest.spyOn(moduleRef.r.eventPublisher, "publishEvent");

    const user = new UserBuilder().buildCreateDTO();
    //When we create a user
    await moduleRef.r.createUserHandler.execute(new CreateUser(user));

    //Then it should have created a user and emitted an event
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("Should not create a user if name is invalid", async () => {
    //Given a potentially invalid name
    const user = new UserBuilder().withUsername("").buildCreateDTO();
    //When we create a user
    const resultPromise = moduleRef.r.createUserHandler.execute(
      new CreateUser(user),
    );

    //Then it should have thrown an error and not have created a user
    await expect(resultPromise).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );

    const users = await executeTask(moduleRef.r.userRepository.findAll());
    expect(users.length).toEqual(0);
  });

  it("Should not create a user if username already exists", async () => {
    //Given an existing user
    const user = new UserBuilder().buildCreateDTO();
    const username = user.username;
    //When we create two users with the same name
    await moduleRef.r.createUserHandler.execute(new CreateUser(user));
    const userCopy = new UserBuilder().withUsername(username).buildCreateDTO();
    const resultPromise = moduleRef.r.createUserHandler.execute(
      new CreateUser(userCopy),
    );
    await expect(resultPromise).rejects.toBeInstanceOf(
      UsernameAlreadyExistsException,
    );
  });
});
