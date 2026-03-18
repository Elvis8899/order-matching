import { Provider } from "@nestjs/common";
import { FakeLoggerService } from "@src/modules/shared/logger/adapters/fake/FakeLogger.service";
import { FPF, O } from "@src/modules/shared/utils/application/monads";
import { removeEntityDates } from "@src/modules/shared/utils/database/database.util";
import { BaseDateEntity } from "@src/modules/shared/utils/domain/dateEntity.base";
import { RealUUIDGeneratorService } from "@src/modules/shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { PinoLogger } from "nestjs-pino";

export class TestHelper {
  static unitDefaultProviders: Provider[] = [
    RealUUIDGeneratorService,
    { provide: PinoLogger, useClass: FakeLoggerService },
  ];

  static expectNone = <T>(res: O.Option<T>) => {
    expect(res).toMatchObject(O.none);
  };

  static expectSome = <T extends BaseDateEntity>(expected: T) => {
    const expectedWithoutDates = removeEntityDates(expected);
    return (res: O.Option<T>) => {
      expect(O.isSome(res)).toBe(true);
      FPF.pipe(
        res,
        O.map(removeEntityDates),
        O.map((entity) => {
          expect(entity).toMatchObject(expectedWithoutDates);
        }),
      );
    };
  };
}
