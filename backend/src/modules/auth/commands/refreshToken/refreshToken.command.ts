import { RefreshSessionRepository } from "@auth/database/refreshSession.repository.port";
import { invalidRefreshTokenException } from "@auth/domain/auth.errors";
import {
  RefreshTokenClaims,
  RefreshTokenInput,
} from "@auth/domain/login.entity";
import { AuthResponseDto } from "@auth/dtos/authResponse.dto";
import { RefreshTokenDto } from "@auth/dtos/refreshToken.dto";
import {
  generateTokens,
  refreshSessionExpiry,
  RefreshTokenRef,
  refreshVerifyOptions,
} from "@auth/util/signTokenParams";
import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { JwtService } from "@nestjs/jwt";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { B, E, FPF, RE, RTE, TE } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UserRepository } from "@user/database/user.repository.port";
import { PinoLogger } from "nestjs-pino";

export class RefreshTokenCommand implements ICommand {
  constructor(public readonly props: RefreshTokenDto) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenCommandHandler implements ICommandHandler<
  RefreshTokenCommand,
  AuthResponseDto
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly uuidGeneratorService: RealUUIDGeneratorService,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("RefreshTokenCommand");
  }

  execute(command: RefreshTokenCommand): Promise<AuthResponseDto> {
    this.logger.info("RefreshTokenCommand command received");
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),
      RE.chain(fromInputRE(RefreshTokenInput, "RefreshTokenInput")),
      RTE.fromReaderEither,

      //Validate refresh token signature, expiration, audience and issuer
      RTE.chainTaskEitherKW(({ refreshToken }) =>
        FPF.pipe(
          TE.tryCatch(
            () =>
              this.jwtService.verifyAsync<object>(
                refreshToken,
                refreshVerifyOptions,
              ),
            () => invalidRefreshTokenException(),
          ),
          // Tokens issued before rotation have no session: log in again
          TE.chainEitherKW((payload) =>
            E.tryCatch(
              () => RefreshTokenClaims.parse(payload),
              () => invalidRefreshTokenException(),
            ),
          ),
        ),
      ),

      //Validate User still exists and the token was not revoked
      //(logout or user update increments the user's token version),
      //then use the user's current data for new tokens
      RTE.chain((claims) =>
        FPF.pipe(
          claims.sub,
          performRTE(this.userRepository.findById, "get user by id"),
          RTE.chainW(RTE.fromOption<Error>(invalidRefreshTokenException)),
          RTE.filterOrElseW(
            (user) => user.tokenVersion === claims.ver,
            invalidRefreshTokenException,
          ),
          RTE.bindTo("user"),
          RTE.bindW("next", () => this.rotateSession(claims)),
        ),
      ),
      RTE.chainTaskK(
        ({ user, next }) =>
          () =>
            generateTokens(this.jwtService)(user, next),
      ),
    )({ logger: this.logger });
    return executeTask(task);
  }

  // A refresh token is single-use. Using one again means it may have been
  // stolen, so the whole session is revoked: both the attacker and the user
  // have to log in again.
  private rotateSession = ({ sid, jti }: RefreshTokenClaims) => {
    const next: RefreshTokenRef = {
      sessionId: sid,
      jti: this.uuidGeneratorService.generateUUID(),
    };
    return FPF.pipe(
      { id: sid, jti, newJti: next.jti, expiresAt: refreshSessionExpiry() },
      performRTE(this.refreshSessionRepository.rotate, "rotate refresh token"),
      RTE.chainW(
        B.fold(
          () =>
            FPF.pipe(
              sid,
              performRTE(
                this.refreshSessionRepository.deleteById,
                "revoke session of a reused refresh token",
              ),
              RTE.chainW(() => RTE.left(invalidRefreshTokenException())),
            ),
          () => RTE.right(next),
        ),
      ),
    );
  };
}
