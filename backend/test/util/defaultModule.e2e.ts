import { AuthGuard } from "@auth/guards/auth.guard";
import { getQueueToken } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import { FakeLoggerService } from "@shared/logger/adapters/fake/FakeLogger.service";
import { AppModule } from "@src/app.module";
import { FakeOrderCreatedProcessor } from "@src/modules/exchange/processors/fakeOrderCreated.processor";
import { OrderCreatedProcessor } from "@src/modules/exchange/processors/orderCreated.processor";
import { PrismaService } from "@src/modules/shared/prisma/adapter/prisma.service";
import { QueueNames } from "@src/modules/shared/queue/queue.config";
import { BullQueueModule } from "@src/modules/shared/queue/queue.module";
import { MockAuthGuardBuilder } from "@test/data-builders/mockAuthGuardBuilder";
import { PinoLogger } from "nestjs-pino";

@Module({})
export class EmptyModule {}

export class E2EModule<U extends object> {
  /** Repositories */
  r!: U;
  repositoryLoader!: (app: NestFastifyApplication) => U;
  //
  app!: NestFastifyApplication;
  prismaService!: PrismaService;
  builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PinoLogger)
    .useClass(FakeLoggerService)
    .overrideGuard(AuthGuard)
    .useValue(new MockAuthGuardBuilder())
    // Queue Overrides
    .overrideModule(BullQueueModule)
    .useModule(EmptyModule)
    .overrideProvider(OrderCreatedProcessor)
    .useValue(FakeOrderCreatedProcessor)
    .overrideProvider(getQueueToken(QueueNames.ORDER_QUEUE))
    .useValue({});
  testingModule!: TestingModule;

  constructor(fn: (app: NestFastifyApplication) => U) {
    this.repositoryLoader = fn;
  }

  async init() {
    this.testingModule = await this.builder.compile();
    this.app = this.testingModule.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    this.prismaService = this.app.get<PrismaService>(PrismaService);
    this.r = this.repositoryLoader(this.app);
    await this.app.init();
    await this.app.getHttpAdapter().getInstance().ready();
  }

  async close() {
    await this.app.close();
    await this.prismaService.$disconnect();
  }
}
