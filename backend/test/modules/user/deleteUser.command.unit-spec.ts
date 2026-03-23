import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";
import {
  DeleteUser,
  DeleteUserHandler,
} from "@user/commands/deleteUser/deleteUser.command";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { UserNotFoundException } from "@user/domain/user.errors";

//Adapters

describe("[Unit] Delete User", () => {
  const moduleRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        DeleteUserHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
      ],
    },
    (app) => ({
      userRepository: app.get(UserRepository),
      deleteUserHandler: app.get(DeleteUserHandler),
      eventPublisher: app.get(DomainEventPublisher),
    }),
  );
  beforeEach(async () => {
    await moduleRef.init();
  });

  it("Should delete user if id is valid", async () => {
    //Given a valid id

    const user = new UserBuilder().build();
    await executeTask(moduleRef.r.userRepository.save(user));
    const id = user.id;

    //When we delete a user
    const resultPromise = moduleRef.r.deleteUserHandler.execute(
      new DeleteUser(id),
    );
    //Then it should have deleted a user
    await expect(resultPromise).resolves.toBe(undefined);
    const users = await executeTask(moduleRef.r.userRepository.findAll());
    expect(users.length).toEqual(0);
  });

  it("Should not delete user if id doesnt exists", async () => {
    //Given a valid id

    const user = new UserBuilder().build();
    await executeTask(moduleRef.r.userRepository.save(user));
    const newId = createTestId(TableNameEnum.None, 0);

    //When we delete a user
    const resultPromise = moduleRef.r.deleteUserHandler.execute(
      new DeleteUser(newId),
    );
    //Then it should not have deleted a user
    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
    const users = await executeTask(moduleRef.r.userRepository.findAll());
    expect(users.length).toEqual(1);
  });

  it("Should emit domain event when user is deleted", async () => {
    //Given a user

    const spy = jest.spyOn(moduleRef.r.eventPublisher, "publishEvent");

    const user = new UserBuilder().build();
    await executeTask(moduleRef.r.userRepository.save(user));
    const id = user.id;

    //When we delete a user
    await moduleRef.r.deleteUserHandler.execute(new DeleteUser(id));

    //Then it should have deleted a user and emitted an event
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
