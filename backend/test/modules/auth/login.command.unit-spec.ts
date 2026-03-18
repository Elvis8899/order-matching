import {
  LoginCommand,
  LoginCommandHandler,
} from "@auth/commands/login/login.command";
import { UnprocessableEntityException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { FakeLoggerService } from "@shared/logger/adapters/fake/FakeLogger.service";
import { executeTask } from "@shared/utils/application/executeTask";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { WrongAuthException } from "@src/modules/auth/domain/auth.errors";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { PinoLogger } from "nestjs-pino";

//Adapters
let userRepository: UserRepository;

describe("[Unit] Create User", () => {
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
        { provide: PinoLogger, useClass: FakeLoggerService },
      ],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    loginCommandHandler =
      moduleRef.get<LoginCommandHandler>(LoginCommandHandler);
  });

  it("Should login user if user is valid", async () => {
    //Given a potentially valid user
    const user = new UserBuilder();
    await executeTask(userRepository.save(user.build()));

    //When we login the user
    const result = await loginCommandHandler.execute(
      new LoginCommand(user.buildCreateDTO()),
    );

    //Then it should have logged the user
    expect(result.accessToken).toBeTruthy();
  });

  it("Should not login user if user is valid but not in db", async () => {
    //Given a potentially valid user
    const user = new UserBuilder();

    //When we try to login the user
    const resultPromise = loginCommandHandler.execute(
      new LoginCommand(user.buildCreateDTO()),
    );

    //Then it should have logged the user
    await expect(resultPromise).rejects.toBeInstanceOf(WrongAuthException);
  });

  it("Should not login a user if username is invalid", async () => {
    //Given a potentially invalid name
    const user = new UserBuilder().withUsername("").buildCreateDTO();
    //When we login a user
    const resultPromise = loginCommandHandler.execute(new LoginCommand(user));

    //Then it should have thrown an error and not have created a user
    await expect(resultPromise).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
