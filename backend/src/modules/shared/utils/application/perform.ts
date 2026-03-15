import {
  loggerOnLeftR,
  loggerOnRightR,
} from "@shared/utils/application/handleLog";
import { FPF, RTE, TE } from "@shared/utils/application/monads";
import { PinoLogger } from "nestjs-pino";

export const performRTE = <InputLike, OutputLike, ErrorLike extends Error>(
  action: (data: InputLike) => TE.TaskEither<ErrorLike, OutputLike>,
  actionDescription: string,
): (<U extends { logger: PinoLogger }>(
  data: InputLike,
) => RTE.ReaderTaskEither<U, ErrorLike, OutputLike>) =>
  FPF.flow(
    RTE.fromTaskEitherK(action),
    RTE.tapError(
      RTE.fromReaderK(loggerOnLeftR(`Failed to ${actionDescription}`)),
    ),
    RTE.tapReader(
      loggerOnRightR(`Successfully managed to ${actionDescription}`),
    ),
  );
