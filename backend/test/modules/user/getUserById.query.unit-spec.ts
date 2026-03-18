import { Test } from "@nestjs/testing";
import { executeTask } from "@shared/utils/application/executeTask";
import { DomainEventPublisherModule } from "@src/modules/shared/domain-event-publisher/domainEventPublisher.module";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";
import { TestHelper } from "@test/util/testHelper";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { UserNotFoundException } from "@user/domain/user.errors";
import {
  GetUserByIdQuery,
  GetUserByIdQueryHandler,
} from "@user/queries/getUserById/getUserById.query";

describe("[Unit] Get User By Id", () => {
  const modRef = new UnitModule(
    Test.createTestingModule({
      imports: [DomainEventPublisherModule],
      providers: [
        ...TestHelper.unitDefaultProviders,
        GetUserByIdQueryHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
      ],
    }),
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

    const query = new GetUserByIdQuery(user.id);

    //With users in database
    await executeTask(modRef.r.userRepository.save(user));

    //When we get user id
    const result = await modRef.r.getUserByIdQueryHandler.execute(query);
    //Then it should show his data
    expect(result.id).toBe(user.id);
  });

  it("Shouldnt get user if id is invalid", async () => {
    //Given a valid query
    const query = new GetUserByIdQuery(createTestId(TableNameEnum.User, 0));

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
    const query = new GetUserByIdQuery(user.id);

    //When we list users
    const resultPromise = modRef.r.getUserByIdQueryHandler.execute(query);
    //Then it should throw an UserNotFoundException
    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
  });
});
