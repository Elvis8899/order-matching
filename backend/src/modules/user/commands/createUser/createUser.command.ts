import { hashPassword } from "@auth/util/password";
import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, O, RE, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UUID } from "@shared/uuid/entities/uuid";
import { UserRepository } from "@user/database/user.repository.port";
import { USER_CREATED } from "@user/domain/events/userCreated.event";
import { Password, User, UserRoleEnum } from "@user/domain/user.entity";
import { usernameAlreadyExistsException } from "@user/domain/user.errors";
import { CreateUserDto } from "@user/dtos/user.dto";
import { PinoLogger } from "nestjs-pino";

export class CreateUser implements ICommand {
  constructor(public readonly props: CreateUserDto) {}
}

@CommandHandler(CreateUser)
export class CreateUserHandler implements ICommandHandler<CreateUser, void> {
  constructor(
    private readonly uuidGeneratorService: RealUUIDGeneratorService,
    private readonly userRepository: UserRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("CreateUser");
  }

  execute(command: CreateUser): Promise<void> {
    const { password: _password, ...loggedProps } = command.props;
    this.logger.info(loggedProps, "CreateUser command received");
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),
      RE.bind("id", () =>
        fromInputRE(UUID, "uuid")(this.uuidGeneratorService.generateUUID()),
      ),

      RE.tap((props) => fromInputRE(Password, "password")(props.password)),
      // Users who sign up are clients; only an admin can promote them
      RE.chain(({ id, username, password }) =>
        fromInputRE(
          User,
          "User",
        )({
          id,
          username,
          password,
          role: UserRoleEnum.Client,
        }),
      ),

      RTE.fromReaderEither,

      //Check username unicity
      RTE.tap(
        FPF.flow(
          (user) => user.username,
          performRTE(this.userRepository.findByUsername, "get user by name"),
          RTE.chainW(
            FPF.flow(
              O.fromPredicate(O.isNone),
              RTE.fromOption(usernameAlreadyExistsException),
            ),
          ),
        ),
      ),

      //Hash password
      RTE.chainW((user) =>
        FPF.pipe(
          user.password,
          RTE.fromTaskK((password) => () => hashPassword(password)),
          RTE.map((password) => ({ ...user, password })),
        ),
      ),

      //Store entity
      RTE.tap(
        performRTE(this.userRepository.save, "save user in storage system."),
      ),

      // //Emit domain event
      RTE.chain((user) =>
        performRTE(
          this.domainEventPublisher.publishEvent,
          "emit user created event.",
        )({
          eventKey: USER_CREATED,
          payload: {
            id: user.id,
            username: user.username,
          },
        }),
      ),
      RTE.map(noop),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
