import {
  loggerOnLeftR,
  loggerOnRightR,
} from "@shared/utils/application/handleLog";
import { FPF, RE } from "@shared/utils/application/monads";
import { validateWith } from "@shared/utils/application/validateWith";
import { PinoLogger } from "nestjs-pino";
import { z } from "zod";

export const fromInputRE = <Validator extends z.ZodType>(
  validator: Validator,
  dataKind: string,
): (<U extends { logger: PinoLogger }>(
  data: z.input<Validator>,
) => RE.ReaderEither<U, Error, z.output<Validator>>) =>
  FPF.flow(
    RE.fromEitherK(validateWith(validator, dataKind)),
    RE.tapError(
      RE.fromReaderK(loggerOnLeftR(`${dataKind} corrupted or outdated`)),
    ),
    RE.tapReader(loggerOnRightR(`${dataKind} parsed successfully.`)),
  );
