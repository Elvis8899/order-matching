import { Global, Module } from "@nestjs/common";
import { getLoggerOptions, loggerEnv } from "@shared/logger/logger.config";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";

declare module "http" {
  interface IncomingMessage {
    requestId: string;
  }
}

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: getLoggerOptions(loggerEnv),
    }),
  ],
})
export class LoggerModule {}
