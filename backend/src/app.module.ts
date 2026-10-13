import { LoginModule } from "@auth/login.module";
import { ExchangeModule } from "@exchange/exchange.module";
import { DynamicModule, ForwardReference, Module, Type } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { LoggerModule } from "@shared/logger/logger.module";
import { PrismaModule } from "@shared/prisma/prisma.module";
import { QueueModule } from "@shared/queue/queue.module";
import { SocketModule } from "@shared/socket/socket.module";
import { AppController } from "@src/app.controller";
import { UserModule } from "@user/user.module";

type NestModuleImport =
  | Type
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference;
// SubModule used by the server
const appModules: NestModuleImport[] = [
  CqrsModule,
  LoggerModule,
  DomainEventPublisherModule,
  ConfigModule.forRoot({
    isGlobal: true,
  }),
  SocketModule,
  QueueModule,
  PrismaModule,
  //
  LoginModule,
  //
  UserModule,
  ExchangeModule,
];

// Infrastructure Modules (DB, config) used by the server
const infrastructureModules: NestModuleImport[] = [];

const controllers = [AppController];
@Module({
  imports: [...appModules, ...infrastructureModules],
  controllers: [...controllers],
  providers: [],
})
export class AppModule {}
