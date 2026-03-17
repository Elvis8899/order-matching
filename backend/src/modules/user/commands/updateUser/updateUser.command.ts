import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, O, RE, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UUID } from "@shared/uuid/entities/uuid";
import { UserRepository } from "@user/database/user.repository.port";
import { USER_UPDATED } from "@user/domain/events/userUpdated.event";
import { User } from "@user/domain/user.entity";
import {
  usernameAlreadyExistsException,
  userNotFoundException,
} from "@user/domain/user.errors";
import { CreateUserDto } from "@user/dtos/user.dto";
import { PinoLogger } from "nestjs-pino";

export class UpdateUser implements ICommand {
  constructor(
    public readonly props: CreateUserDto,
    public readonly id: string,
  ) {}
}

@CommandHandler(UpdateUser)
export class UpdateUserHandler implements ICommandHandler<UpdateUser, void> {
  constructor(
    private readonly uuidGeneratorService: RealUUIDGeneratorService,
    private readonly userRepository: UserRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("UpdateUser");
  }

  execute(command: UpdateUser): Promise<void> {
    this.logger.info(command.props, "UpdateUser command received");
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),
      RE.bind("id", () => fromInputRE(UUID, "uuid")(command.id)),
      RE.chain(fromInputRE(User, "user")),

      RTE.fromReaderEither,

      //Validate User exists
      RTE.tap(
        FPF.flow(
          (data) => data.id,
          performRTE(this.userRepository.findById, "get user by id"),
          RTE.chainW(RTE.fromOption<Error>(userNotFoundException)),
        ),
      ),

      //Check username unicity
      RTE.tap((user) =>
        FPF.pipe(
          user.username,
          performRTE(
            this.userRepository.findByUsername,
            "get user by username",
          ),
          RTE.chainW(
            FPF.flow(
              O.filter((u) => u.id !== user.id),
              O.fromPredicate(O.isNone),
              RTE.fromOption(usernameAlreadyExistsException),
            ),
          ),
        ),
      ),

      //Store entity
      RTE.tap(
        performRTE(this.userRepository.save, "save user in storage system."),
      ),

      //Emit domain event
      RTE.chain((user) =>
        performRTE(
          this.domainEventPublisher.publishEvent,
          "emit user Updated event.",
        )({
          eventKey: USER_UPDATED,
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
