import { AuthGuard } from "@auth/guards/auth.guard";
import { CreatedOrderProcessor } from "@exchange/processors/createdOrder.processor";
import { getQueueToken } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import { FakeLoggerService } from "@shared/logger/adapters/fake/FakeLogger.service";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { QueueNames } from "@shared/queue/queue.config";
import { BullQueueModule } from "@shared/queue/queue.module";
import { AppModule } from "@src/app.module";
import { MockAuthGuardBuilder } from "@test/data-builders/mockAuthGuardBuilder";
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
  builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PinoLogger)
    .useClass(FakeLoggerService)
    .overrideGuard(AuthGuard)
    .useValue(new MockAuthGuardBuilder().build())
    // Queue Overrides
    .overrideModule(BullQueueModule)
    .useModule(EmptyModule)
    .overrideProvider(CreatedOrderProcessor)
    .useValue({})
    .overrideProvider(getQueueToken(QueueNames.ORDER_QUEUE))
    .useValue({});
  testingModule!: TestingModule;

  constructor(fn: (app: NestFastifyApplication) => U) {
    this.repositoryLoader = fn;
  }

  async init() {
    this.testingModule = await this.builder.compile();
    this.app = await createTestApp(this.testingModule);
    this.prismaService = this.app.get<PrismaService>(PrismaService);
    this.r = this.repositoryLoader(this.app);
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
