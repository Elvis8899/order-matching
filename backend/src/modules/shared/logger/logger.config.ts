import "@shared/utils/config/dotenv";
import { get } from "env-var";
import { LoggerOptions, stdTimeFunctions } from "pino";
import { GenReqId, Options } from "pino-http";
import { v4 as uuidv4 } from "uuid";

type LoggerEnv = {
  prettify: boolean;
  level: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
};

export const loggerEnv: LoggerEnv = {
  prettify: get("LOG_PRETTIFY").required().asBool(),
  level: get("LOG_LEVEL")
    .required()
    .asEnum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),
};

export const getGenReqId: GenReqId = (req) => req.requestId || uuidv4();

export const getLoggerOptions = (env: LoggerEnv): LoggerOptions & Options => ({
  name: "library",
  genReqId: getGenReqId,
  formatters: { bindings: () => ({}) },
  // redact
  timestamp: stdTimeFunctions.isoTime,
  level: env.level,
  transport: env.prettify
    ? {
        target: "pino-pretty",
        options: {
          singleLine: true,
        },
      }
    : undefined,
});
