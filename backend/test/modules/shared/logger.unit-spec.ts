import { FakeLoggerService } from "@shared/logger/adapters/fake/FakeLogger.service";
import { getGenReqId, getLoggerOptions } from "@shared/logger/logger.config";
import { FPF } from "@shared/utils/application/monads";
import { UnitModule } from "@test/util/defaultModule.unit";
import { PinoLogger } from "nestjs-pino";

const moduleRef = new UnitModule(
  {
    providers: [{ provide: PinoLogger, useClass: FakeLoggerService }],
  },
  (_) => ({}),
);
beforeAll(async () => {
  await moduleRef.init();
});

describe("[Unit] Logger", () => {
  it("Logger should return uuid if requestId is missing in request", () => {
    // When getting req id
    const res = getGenReqId(FPF.unsafeCoerce({}), FPF.unsafeCoerce({}));

    expect(res).toBeTruthy();
  });

  it("Logger should return uuid if requestId is not missing in request", () => {
    const uuid = "test";
    // When getting req id
    const res = getGenReqId(
      FPF.unsafeCoerce({ requestId: uuid }),
      FPF.unsafeCoerce({}),
    );

    expect(res).toBe(uuid);
  });

  it("Logger variables should be properly set", () => {
    const variables = getLoggerOptions({ level: "debug", prettify: true });
    // When getting req id
    expect(variables.transport).toBeTruthy();
    expect(variables.transport?.options).toBeTruthy();
  });

  it("Logger variables should be properly set", () => {
    const variables = getLoggerOptions({ level: "fatal", prettify: false });
    // When getting req id
    expect(variables.transport).toBeFalsy();
    expect(variables.level).toBe("fatal");
  });
});
