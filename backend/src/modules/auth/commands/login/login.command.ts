import { wrongAuthException } from "@auth/domain/auth.errors";
import { LoginInput } from "@auth/domain/login.entity";
import { AuthResponseDto } from "@auth/dtos/authResponse.dto";
import { LoginDto } from "@auth/dtos/login.dto";
import { getSignTokenParams } from "@auth/util/signTokenParams";
import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { JwtService } from "@nestjs/jwt";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, RE, RTE } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { UserRepository } from "@user/database/user.repository.port";
import { User } from "@user/domain/user.entity";
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
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("LoginCommand");
  }

  execute(command: LoginCommand): Promise<AuthResponseDto> {
    this.logger.info(command.props, "LoginCommand command received");
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),

      RE.chain(fromInputRE(LoginInput, "LoginInput")),
      RTE.fromReaderEither,

      //Validate User exists
      RTE.chain((data) =>
        FPF.pipe(
          data.username,
          performRTE(this.userRepository.findByUsername, "get user by id"),
          RTE.chainW(RTE.fromOption<Error>(wrongAuthException)),
        ),
      ),

      RTE.chainTaskK((user) => () => this.generateTokens(user)),
    )({ logger: this.logger });
    return executeTask(task);
  }

  public async generateTokens(user: User): Promise<AuthResponseDto> {
    const { payload, signOptions, refreshOptions } = getSignTokenParams(
      user.id,
      {
        username: user.username,
      },
    );
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, signOptions),
      this.jwtService.signAsync(payload, refreshOptions),
    ]);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }
}
