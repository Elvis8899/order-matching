import { LoginModule } from "@auth/login.module";
import { DynamicModule, ForwardReference, Module, Type } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { LoggerModule } from "@shared/logger/logger.module";
import { PrismaModule } from "@shared/prisma/prisma.module";
import { AppController } from "@src/app.controller";
import { ExchangeModule } from "@src/modules/exchange/exchange.module";
import { QueueModule } from "@src/modules/shared/queue/queue.module";
import { SocketModule } from "@src/modules/shared/socket/socket.module";
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
