import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, RTE } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { UUID } from "@shared/uuid/entities/uuid";
import { UserRepository } from "@user/database/user.repository.port";
import { PinoLogger } from "nestjs-pino";

export class LogoutCommand implements ICommand {
  constructor(public readonly userId: string) {}
}

/** Revokes every refresh token issued to the user. */
@CommandHandler(LogoutCommand)
export class LogoutCommandHandler implements ICommandHandler<
  LogoutCommand,
  void
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("LogoutCommand");
  }

  execute(command: LogoutCommand): Promise<void> {
    this.logger.info(command.userId, "LogoutCommand command received");
    const task = FPF.pipe(
      command.userId,
      fromInputRE(UUID, "uuid"),
      RTE.fromReaderEither,
      RTE.chain(
        performRTE(
          this.userRepository.incrementTokenVersion,
          "revoke user refresh tokens",
        ),
      ),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
