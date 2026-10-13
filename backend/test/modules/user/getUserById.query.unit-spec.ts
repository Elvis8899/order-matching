import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { Requester, UserRoleEnum } from "@user/domain/user.entity";
import { UserNotFoundException } from "@user/domain/user.errors";
import {
  GetUserByIdQuery,
  GetUserByIdQueryHandler,
} from "@user/queries/getUserById/getUserById.query";

describe("[Unit] Get User By Id", () => {
  const admin: Requester = {
    id: createTestId(TableNameEnum.None, 1),
    role: UserRoleEnum.Admin,
  };
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        GetUserByIdQueryHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
      ],
    },
    (ref) => ({
      userRepository: ref.get(UserRepository),
      getUserByIdQueryHandler: ref.get(GetUserByIdQueryHandler),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should get user if he exists", async () => {
    //Given a valid query
    const user = new UserBuilder().build();

    const query = new GetUserByIdQuery(user.id, {
      id: user.id,
      role: UserRoleEnum.Client,
    });

    //With users in database
    await executeTask(modRef.r.userRepository.save(user));

    //When we get user id
    const result = await modRef.r.getUserByIdQueryHandler.execute(query);
    //Then it should show his data
    expect(result.id).toBe(user.id);
  });

  it("Shouldnt get user if id is invalid", async () => {
    //Given a valid query
    const query = new GetUserByIdQuery(
      createTestId(TableNameEnum.User, 0),
      admin,
    );

    //With users in database
    const user = new UserBuilder(1).build();
    await executeTask(modRef.r.userRepository.save(user));

    //When get user
    const resultPromise = modRef.r.getUserByIdQueryHandler.execute(query);
    //Then it should show a list of users

    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
  });

  it("Shouldnt get user if there isnt users", async () => {
    //Given a valid query and no users in database

    const user = new UserBuilder(1).build();
    const query = new GetUserByIdQuery(user.id, admin);

    //When we list users
    const resultPromise = modRef.r.getUserByIdQueryHandler.execute(query);
    //Then it should throw an UserNotFoundException
    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
  });

  it("Should let an admin get any user", async () => {
    //Given a user
    const user = new UserBuilder().build();
    await executeTask(modRef.r.userRepository.save(user));

    //When an admin gets them
    const result = await modRef.r.getUserByIdQueryHandler.execute(
      new GetUserByIdQuery(user.id, admin),
    );

    //Then it should show their data
    expect(result.id).toBe(user.id);
  });

  it("Shouldnt let a client get someone else", async () => {
    //Given a user
    const user = new UserBuilder().build();
    await executeTask(modRef.r.userRepository.save(user));

    //When another client gets them
    const resultPromise = modRef.r.getUserByIdQueryHandler.execute(
      new GetUserByIdQuery(user.id, {
        id: createTestId(TableNameEnum.None, 2),
        role: UserRoleEnum.Client,
      }),
    );

    //Then the user is reported as not found
    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
  });
});
