import { authConfig, jwtModuleOptions } from "@auth/auth.config";
import { LoginCommandHandler } from "@auth/commands/login/login.command";
import { LoginController } from "@auth/commands/login/login.controller";
import { LogoutCommandHandler } from "@auth/commands/logout/logout.command";
import { LogoutController } from "@auth/commands/logout/logout.controller";
import { RefreshTokenCommandHandler } from "@auth/commands/refreshToken/refreshToken.command";
import { RefreshTokenController } from "@auth/commands/refreshToken/refreshToken.controller";
import { RealRefreshSessionRepository } from "@auth/database/realRefreshSession.repository";
import { RefreshSessionRepository } from "@auth/database/refreshSession.repository.port";
import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { RealUserRepository } from "@user/database/realUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

const controllers = [LoginController, RefreshTokenController, LogoutController];
const commandHandlers = [
  LoginCommandHandler,
  RefreshTokenCommandHandler,
  LogoutCommandHandler,
];
const services = [RealUUIDGeneratorService];
const repositories = [
  {
    provide: RefreshSessionRepository,
    useClass: RealRefreshSessionRepository,
  },
  {
    provide: UserRepository,
    useClass: RealUserRepository,
  },
];

@Module({
  imports: [
    CqrsModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: authConfig.loginRateWindowSeconds * 1000,
          limit: authConfig.loginRateLimit,
        },
      ],
      errorMessage: "Muitas tentativas de login. Tente novamente em instantes.",
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory: jwtModuleOptions,
    }),
  ],
  controllers: [...controllers],
  providers: [...commandHandlers, ...services, ...repositories],
})
export class LoginModule {}
