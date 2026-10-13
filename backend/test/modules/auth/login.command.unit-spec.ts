import {
  LoginCommand,
  LoginCommandHandler,
} from "@auth/commands/login/login.command";
import { FakeRefreshSessionRepository } from "@auth/database/fakeRefreshSession.repository";
import { RefreshSessionRepository } from "@auth/database/refreshSession.repository.port";
import { WrongAuthException } from "@auth/domain/auth.errors";
import { hashPassword } from "@auth/util/password";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { FakeLoggerService } from "@shared/logger/adapters/fake/fakeLogger.service";
import { executeTask } from "@shared/utils/application/executeTask";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { PinoLogger } from "nestjs-pino";

//Adapters
let userRepository: UserRepository;
let refreshSessionRepository: FakeRefreshSessionRepository;

describe("[Unit] Login", () => {
  let loginCommandHandler: LoginCommandHandler;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DomainEventPublisherModule],
      providers: [
        {
          provide: DomainEventPublisherModule,
          useClass: DomainEventPublisher,
        },
        JwtService,
        LoginCommandHandler,
        RealUUIDGeneratorService,
        { provide: UserRepository, useClass: FakeUserRepository },
        {
          provide: RefreshSessionRepository,
          useClass: FakeRefreshSessionRepository,
        },
        { provide: PinoLogger, useClass: FakeLoggerService },
      ],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    refreshSessionRepository = moduleRef.get(RefreshSessionRepository);
    loginCommandHandler =
      moduleRef.get<LoginCommandHandler>(LoginCommandHandler);
  });

  it("Should login user if user is valid", async () => {
    //Given a potentially valid user
    const password = "password123";
    const hash = await hashPassword(password);
    const user = new UserBuilder().withPassword(hash);
    await executeTask(userRepository.save(user.build()));

    //When we create a user
    const result = await loginCommandHandler.execute(
      new LoginCommand(user.withPassword(password).buildCreateDTO()),
    );

    //Then it should have logged the user
    expect(result.accessToken).toBeTruthy();
  });

  it("Should start a refresh session and remove the user's expired ones", async () => {
    //Given a user with an expired session, and another user's expired session
    const password = "password123";
    const user = new UserBuilder().withPassword(await hashPassword(password));
    await executeTask(userRepository.save(user.build()));
    const yesterday = new Date(Date.now() - 86400 * 1000);
    const otherUserId = createTestId(TableNameEnum.User, 99);
    const expired = (n: number, userId: string) => ({
      id: createTestId(TableNameEnum.RefreshSession, n),
      userId,
      currentJti: createTestId(TableNameEnum.None, n),
      expiresAt: yesterday,
    });
    await executeTask(
      refreshSessionRepository.create(expired(1, user.build().id)),
    );
    await executeTask(refreshSessionRepository.create(expired(2, otherUserId)));

    //When the user logs in
    const result = await loginCommandHandler.execute(
      new LoginCommand(user.withPassword(password).buildCreateDTO()),
    );

    //Then only its new session and the other user's session remain
    const sessions = await executeTask(refreshSessionRepository.findAll());
    expect(sessions.map((s) => s.userId).sort()).toEqual(
      [result.user.id, otherUserId].sort(),
    );
    expect(
      sessions.find((s) => s.userId === result.user.id)?.expiresAt.getTime(),
    ).toBeGreaterThan(Date.now());
  });

  it("Should not login a user who does not exist", async () => {
    const password = "password123";
    const hash = await hashPassword(password);
    //Given a potentially invalid name
    const user = new UserBuilder().withPassword(hash).buildCreateDTO();
    //When we create a user
    const resultPromise = loginCommandHandler.execute(new LoginCommand(user));

    //Then it should have thrown an error and not have created a user
    await expect(resultPromise).rejects.toBeInstanceOf(WrongAuthException);
  });

  it("Should not login a user if password is invalid", async () => {
    //Given an existing user
    const password = "password123";
    const hash = await hashPassword(password);
    const user = new UserBuilder().withPassword(hash);
    await executeTask(userRepository.save(user.build()));

    const resultPromise = loginCommandHandler.execute(
      new LoginCommand(user.buildCreateDTO()),
    );

    await expect(resultPromise).rejects.toBeInstanceOf(WrongAuthException);
  });
});
