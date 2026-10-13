import { FPF, O } from "@shared/utils/application/monads";
import { removeEntityDates } from "@shared/utils/database/database.util";
import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";

export class TestHelper {
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
