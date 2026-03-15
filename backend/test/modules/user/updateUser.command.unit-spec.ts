import { comparePassword } from "@auth/util/password";
import { UnprocessableEntityException } from "@nestjs/common";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { O } from "@shared/utils/application/monads";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";
import {
  UpdateUser,
  UpdateUserHandler,
} from "@user/commands/updateUser/updateUser.command";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { Requester, User, UserRoleEnum } from "@user/domain/user.entity";
import {
  RoleChangeForbiddenException,
  UsernameAlreadyExistsException,
  UserNotFoundException,
} from "@user/domain/user.errors";
import { UpdateUserDto } from "@user/dtos/user.dto";

//Adapters

describe("[Unit] Update User", () => {
  const userBuilder = new UserBuilder(1);
  let originalUser: User;
  let self: Requester;
  const admin: Requester = {
    id: createTestId(TableNameEnum.None, 1),
    role: UserRoleEnum.Admin,
  };
  const moduleRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        UpdateUserHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
      ],
    },
    (ref) => ({
      userRepository: ref.get(UserRepository),
      updateUserHandler: ref.get(UpdateUserHandler),
      eventPublisher: ref.get(DomainEventPublisher),
    }),
  );

  const findStored = async (id: string) =>
    O.toUndefined(await executeTask(moduleRef.r.userRepository.findById(id)));

  const update = (dto: UpdateUserDto, requester: Requester = self) =>
    moduleRef.r.updateUserHandler.execute(
      new UpdateUser(dto, originalUser.id, requester),
    );

  beforeEach(async () => {
    await moduleRef.init();
    userBuilder.reset();
    originalUser = await userBuilder.buildWithHashedPassword();
    self = { id: originalUser.id, role: originalUser.role };
    await executeTask(moduleRef.r.userRepository.save(originalUser));
  });

  it("Should update the username and keep the password", async () => {
    //When the user changes only their username
    const resultPromise = update({ username: "renamed" });

    //Then it is updated, with the same password hash
    await expect(resultPromise).resolves.toEqual(undefined);
    const stored = await findStored(originalUser.id);
    expect(stored?.username).toBe("renamed");
    expect(stored?.password).toBe(originalUser.password);
  });

  it("Should hash a new password", async () => {
    //When the user changes their password
    await update({ username: originalUser.username, password: "new-pass-123" });

    //Then the stored hash matches the new password
    const stored = await findStored(originalUser.id);
    expect(await comparePassword("new-pass-123", stored?.password ?? "")).toBe(
      true,
    );
  });

  it("Should revoke the user's refresh tokens", async () => {
    //When the user is updated
    await update({ username: originalUser.username });

    //Then the token version is incremented
    const stored = await findStored(originalUser.id);
    expect(stored?.tokenVersion).toBe(originalUser.tokenVersion + 1);
  });

  it("Should emit domain event when user is updated", async () => {
    const spy = jest.spyOn(moduleRef.r.eventPublisher, "publishEvent");

    //When we update the user
    await update({ username: originalUser.username });

    //Then it should have emitted an event
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("Should let an admin update someone else and change the role", async () => {
    //When an admin promotes the user
    await update(
      { username: originalUser.username, role: UserRoleEnum.Admin },
      admin,
    );

    //Then the user is an admin
    const stored = await findStored(originalUser.id);
    expect(stored?.role).toBe(UserRoleEnum.Admin);
  });

  it("Should let a client send their current role", async () => {
    //When the user sends the role they already have
    const resultPromise = update({
      username: "renamed",
      role: UserRoleEnum.Client,
    });

    //Then it is accepted
    await expect(resultPromise).resolves.toEqual(undefined);
  });

  it("Should not let a client change their role", async () => {
    //When the user tries to become an admin
    const resultPromise = update({
      username: originalUser.username,
      role: UserRoleEnum.Admin,
    });

    //Then it is forbidden and the role is kept
    await expect(resultPromise).rejects.toBeInstanceOf(
      RoleChangeForbiddenException,
    );
    const stored = await findStored(originalUser.id);
    expect(stored?.role).toBe(UserRoleEnum.Client);
  });

  it("Should not let a client update someone else", async () => {
    //When another client updates the user
    const resultPromise = update(
      { username: "renamed" },
      { id: createTestId(TableNameEnum.None, 2), role: UserRoleEnum.Client },
    );

    //Then the user is reported as not found and kept
    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
    const stored = await findStored(originalUser.id);
    expect(stored?.username).toBe(originalUser.username);
  });

  it("Should not update an user if it doesn't exist", async () => {
    //When an admin updates an id that doesn't exist
    const resultPromise = moduleRef.r.updateUserHandler.execute(
      new UpdateUser(
        { username: "renamed" },
        "c017f4a9-c458-4ea7-829c-021c6a608503",
        admin,
      ),
    );

    //Then it should have thrown an error
    await expect(resultPromise).rejects.toBeInstanceOf(UserNotFoundException);
  });

  it.each([
    ["the name is empty", { username: "" }],
    ["the password is too short", { username: "renamed", password: "short" }],
    ["the role is unknown", { username: "renamed", role: "owner" }],
  ])("Should not update an user if %s", async (_, dto) => {
    //When we update the user with invalid data
    const resultPromise = update(dto as UpdateUserDto, admin);

    //Then it should have thrown an error and not have updated the user
    await expect(resultPromise).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    const stored = await findStored(originalUser.id);
    expect(stored?.username).toBe(originalUser.username);
  });

  it("Should not update an user if username already exists", async () => {
    // Given another user
    const user = new UserBuilder(2).build();
    await executeTask(moduleRef.r.userRepository.save(user));

    //When we update the user to have the same name
    const resultPromise = update({ username: user.username });

    //Then it should have thrown an error
    await expect(resultPromise).rejects.toBeInstanceOf(
      UsernameAlreadyExistsException,
    );
  });
});
