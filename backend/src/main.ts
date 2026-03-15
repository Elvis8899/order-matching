import { NestFactory } from "@nestjs/core";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "@src/app.module";
import { configureApp, createAdapter } from "@src/app.setup";
import { Logger } from "nestjs-pino";

// Everything except listening lives in app.setup.ts, which the e2e tests use
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createAdapter(),
    { bufferLogs: true },
  );
  await configureApp(app);
  app.enableShutdownHooks();

  const host = process.env.HOST || "0.0.0.0";
  const port = process.env.PORT || 3000;
  await app.listen(port, host);

  app.get(Logger).log(`API-Gateway is listening on port ${port.toString()}`);
}

bootstrap().catch((error: unknown) => {
  /* eslint-disable-next-line no-console -- Main file - cant use logger */
  console.error(error);
  process.exit(1);
});
