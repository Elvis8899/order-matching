import { hashPassword } from "@auth/util/password";
import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, O, RE, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { UUID } from "@shared/uuid/entities/uuid";
import { UserRepository } from "@user/database/user.repository.port";
import { USER_UPDATED } from "@user/domain/events/userUpdated.event";
import {
  canManageUser,
  isAdmin,
  Password,
  Requester,
  User,
} from "@user/domain/user.entity";
import {
  roleChangeForbiddenException,
  usernameAlreadyExistsException,
  userNotFoundException,
} from "@user/domain/user.errors";
import { UpdateUserDto } from "@user/dtos/user.dto";
import { PinoLogger } from "nestjs-pino";

export class UpdateUser implements ICommand {
  constructor(
    public readonly props: UpdateUserDto,
    public readonly id: string,
    public readonly requester: Requester,
  ) {}
}

@CommandHandler(UpdateUser)
export class UpdateUserHandler implements ICommandHandler<UpdateUser, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("UpdateUser");
  }

  execute(command: UpdateUser): Promise<void> {
    const { password: _password, ...loggedProps } = command.props;
    this.logger.info(loggedProps, "UpdateUser command received");
    const { requester } = command;
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),
      RE.bind("id", () => fromInputRE(UUID, "uuid")(command.id)),
      RTE.fromReaderEither,

      //Users may only update themselves; someone else's account is
      //reported as not found
      RTE.filterOrElseW(
        ({ id }) => canManageUser(requester, id),
        userNotFoundException,
      ),

      //Validate User exists
      RTE.bindW("existing", ({ id }) =>
        FPF.pipe(
          id,
          performRTE(this.userRepository.findById, "get user by id"),
          RTE.chainW(RTE.fromOption<Error>(userNotFoundException)),
        ),
      ),

      //Only admins may change roles
      RTE.filterOrElseW(
        ({ role, existing }) =>
          role === undefined || role === existing.role || isAdmin(requester),
        roleChangeForbiddenException,
      ),

      //Hash the new password, or keep the current hash
      RTE.bindW("passwordHash", ({ password, existing }) =>
        password === undefined
          ? RTE.right(existing.password)
          : FPF.pipe(
              password,
              fromInputRE(Password, "password"),
              RTE.fromReaderEither,
              RTE.chainTaskK((plain) => () => hashPassword(plain)),
            ),
      ),

      RTE.chainW(({ id, username, role, existing, passwordHash }) =>
        FPF.pipe(
          {
            ...existing,
            id,
            username,
            role: role ?? existing.role,
            password: passwordHash,
          },
          fromInputRE(User, "user"),
          RTE.fromReaderEither,
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

      //Revoke existing sessions, as the password or role may have changed
      RTE.tap((user) =>
        performRTE(
          this.userRepository.incrementTokenVersion,
          "revoke user refresh tokens",
        )(user.id),
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
