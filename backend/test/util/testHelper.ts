import { Provider } from "@nestjs/common";
import { FakeLoggerService } from "@src/modules/shared/logger/adapters/fake/FakeLogger.service";
import { RealUUIDGeneratorService } from "@src/modules/shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { PinoLogger } from "nestjs-pino";

export class TestHelper {
  static unitDefaultProviders: Provider[] = [
    RealUUIDGeneratorService,
    { provide: PinoLogger, useClass: FakeLoggerService },
  ];
}
