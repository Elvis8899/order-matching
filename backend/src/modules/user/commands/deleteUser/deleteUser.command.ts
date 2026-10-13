import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { UUID } from "@shared/uuid/entities/uuid";
import { UserRepository } from "@user/database/user.repository.port";
import { USER_DELETED } from "@user/domain/events/userDeleted.event";
import { canManageUser, Requester } from "@user/domain/user.entity";
import { userNotFoundException } from "@user/domain/user.errors";
import { PinoLogger } from "nestjs-pino";

export class DeleteUser implements ICommand {
  constructor(
    public readonly props: string,
    public readonly requester: Requester,
  ) {}
}

@CommandHandler(DeleteUser)
export class DeleteUserHandler implements ICommandHandler<DeleteUser, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("DeleteUser");
  }

  execute(command: DeleteUser): Promise<void> {
    this.logger.info(command.props, "DeleteUser command received");
    const task = FPF.pipe(
      //Data validation
      command.props,
      fromInputRE(UUID, "id"),
      RTE.fromReaderEither,

      // Users may only delete themselves; someone else's account is
      // reported as not found
      RTE.filterOrElseW(
        (id) => canManageUser(command.requester, id),
        userNotFoundException,
      ),

      // Validate User exists
      RTE.chain(
        FPF.flow(
          performRTE(this.userRepository.findById, "get user by id"),
          RTE.chain((_) => RTE.fromOption<Error>(userNotFoundException)(_)),
        ),
      ),

      // Delete entity
      RTE.tap((existingUser) =>
        performRTE(
          this.userRepository.deleteById,
          "delete user in storage system.",
        )(existingUser.id),
      ),

      // Emit domain event
      RTE.chain((user) =>
        performRTE(
          this.domainEventPublisher.publishEvent,
          "emit user deleted event.",
        )({
          eventKey: USER_DELETED,
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
