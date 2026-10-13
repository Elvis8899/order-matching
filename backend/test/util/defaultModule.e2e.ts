import { AuthGuard } from "@auth/guards/auth.guard";
import { CreatedOrderProcessor } from "@exchange/processors/createdOrder.processor";
import { getQueueToken } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test, TestingModule, TestingModuleBuilder } from "@nestjs/testing";
import { FakeLoggerService } from "@shared/logger/adapters/fake/fakeLogger.service";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { QueueNames } from "@shared/queue/queue.config";
import { BullQueueModule } from "@shared/queue/queue.module";
import { AppModule } from "@src/app.module";
import { MockAuthGuardBuilder } from "@test/dataBuilders/mockAuthGuardBuilder";
import { createTestApp } from "@test/util/createTestApp";
import { PinoLogger } from "nestjs-pino";
import request from "supertest";

@Module({})
export class EmptyModule {}

export class E2EModule<U extends object> {
  /** Repositories */
  r!: U;
  repositoryLoader!: (app: NestFastifyApplication) => U;
  //
  app!: NestFastifyApplication;
  prismaService!: PrismaService;
  /** Who requests are made as; reset() it after changing it in a test */
  authGuard = new MockAuthGuardBuilder();
  builder: TestingModuleBuilder;
  testingModule!: TestingModule;

  /**
   * With realAuth, AuthGuard is kept: requests need real tokens, from
   * POST /v1/login
   */
  constructor(
    fn: (app: NestFastifyApplication) => U,
    { realAuth = false }: { realAuth?: boolean } = {},
  ) {
    this.repositoryLoader = fn;
    const builder = Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PinoLogger)
      .useClass(FakeLoggerService)
      // Queue Overrides
      .overrideModule(BullQueueModule)
      .useModule(EmptyModule)
      .overrideProvider(CreatedOrderProcessor)
      .useValue({})
      .overrideProvider(getQueueToken(QueueNames.ORDER_QUEUE))
      .useValue({});
    this.builder = realAuth
      ? builder
      : builder.overrideGuard(AuthGuard).useValue(this.authGuard.build());
  }

  /** beforeInit runs once the app is set up, before Nest registers routes */
  async init(beforeInit?: (app: NestFastifyApplication) => void) {
    this.testingModule = await this.builder.compile();
    this.app = await createTestApp(this.testingModule);
    this.prismaService = this.app.get<PrismaService>(PrismaService);
    this.r = this.repositoryLoader(this.app);
    beforeInit?.(this.app);
    await this.app.init();
    await this.app.getHttpAdapter().getInstance().ready();
  }

  async close() {
    await this.app.close();
    await this.prismaService.$disconnect();
  }

  request() {
    return request(this.app.getHttpServer());
  }
}
