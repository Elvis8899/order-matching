import { UnprocessableEntityException } from "@nestjs/common";
import { E, FPF, ID } from "@shared/utils/application/monads";
import { z } from "zod";

/**
 * Decode, Either scope using zod. (Was io-ts)
 * In fact, zod:
 * - works synchronously (`Either` and not `TaskEither`)
 * - returns `Errors` as left which is typically `Error[]`
 * In order to use it more easily, this small helper makes the mandatory conversion
 *
 * @param validator : an zod validator
 */

export function validateWith<Validator extends z.ZodType>(
  validator: Validator,
  dataKind: string,
): (input: z.input<Validator>) => E.Either<Error, z.output<Validator>> {
  return FPF.flow(
    (input: z.input<Validator>) => validator.safeParse(input),
    ID.map(({ success, data, error }) =>
      success ? E.right(data) : E.left(error),
    ),
    E.mapLeft(
      (error) =>
        new UnprocessableEntityException(
          `The data ${dataKind} is invalid - ${error}`,
          `invalid-${dataKind}`,
        ),
    ),
  );
}

// For use on DB
export const validateFromUnknown = <Validator extends z.ZodType>(
  validator: Validator,
  dataKind: string,
) => FPF.flow(FPF.unsafeCoerce, validateWith<Validator>(validator, dataKind));
