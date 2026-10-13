import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { TestingModule } from "@nestjs/testing";
import { configureApp, createAdapter } from "@src/app.setup";

/**
 * Builds the app from a compiled testing module with the same adapter and
 * setup as main.ts (helmet, Swagger, request context, the user hook).
 * Call app.init() afterwards, as before.
 */
export const createTestApp = (
  testingModule: TestingModule,
): Promise<NestFastifyApplication> =>
  configureApp(
    testingModule.createNestApplication<NestFastifyApplication>(
      createAdapter(),
    ),
  );
