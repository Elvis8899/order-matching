import { RefreshSessionRepository } from "@auth/database/refreshSession.repository.port";
import { wrongAuthException } from "@auth/domain/auth.errors";
import { LoginInput } from "@auth/domain/login.entity";
import { AuthResponseDto } from "@auth/dtos/authResponse.dto";
import { LoginDto } from "@auth/dtos/login.dto";
import { comparePassword } from "@auth/util/password";
import {
  generateTokens,
  refreshSessionExpiry,
  RefreshTokenRef,
} from "@auth/util/signTokenParams";
import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { JwtService } from "@nestjs/jwt";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { B, FPF, RE, RTE, TE } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UserRepository } from "@user/database/user.repository.port";
import { PinoLogger } from "nestjs-pino";

export class LoginCommand implements ICommand {
  constructor(public readonly props: LoginDto) {}
}

@CommandHandler(LoginCommand)
export class LoginCommandHandler implements ICommandHandler<
  LoginCommand,
  AuthResponseDto
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly uuidGeneratorService: RealUUIDGeneratorService,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("LoginCommand");
  }

  execute(command: LoginCommand): Promise<AuthResponseDto> {
    this.logger.info(
      { username: command.props.username },
      "LoginCommand command received",
    );
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),

      RE.chain(fromInputRE(LoginInput, "LoginInput")),
      RTE.fromReaderEither,

      //Validate User exists
      RTE.chain((data) =>
        FPF.pipe(
          data.username,
          performRTE(
            this.userRepository.findByUsername,
            "get user by username",
          ),
          RTE.chainW(RTE.fromOption<Error>(wrongAuthException)),
        ),
      ),

      // Validate password
      RTE.chainTaskEitherKW((user) =>
        FPF.pipe(
          () => comparePassword(command.props.password, user.password),
          TE.fromTask,
          TE.chainW(
            B.fold(
              () => TE.left(wrongAuthException()),
              () => TE.right(user),
            ),
          ),
        ),
      ),
      RTE.bindTo("user"),
      RTE.bindW("session", ({ user }) => this.startSession(user.id)),
      RTE.chainTaskK(
        ({ user, session }) =>
          () =>
            generateTokens(this.jwtService)(user, session),
      ),
    )({ logger: this.logger });
    return executeTask(task);
  }

  // Each login starts a refresh session; the user's expired ones are
  // removed at the same time
  private startSession = (userId: string) => {
    const session: RefreshTokenRef = {
      sessionId: this.uuidGeneratorService.generateUUID(),
      jti: this.uuidGeneratorService.generateUUID(),
    };
    return FPF.pipe(
      userId,
      performRTE(
        this.refreshSessionRepository.deleteExpired,
        "remove expired refresh sessions",
      ),
      RTE.chainW(() =>
        FPF.pipe(
          {
            id: session.sessionId,
            userId,
            currentJti: session.jti,
            expiresAt: refreshSessionExpiry(),
          },
          performRTE(
            this.refreshSessionRepository.create,
            "create refresh session",
          ),
        ),
      ),
      RTE.map(() => session),
    );
  };
}
