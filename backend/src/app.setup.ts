import { RequestJWTPayload } from "@auth/domain/login.entity";
import helmet from "@fastify/helmet";
import fastifyRequestContext from "@fastify/request-context";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { contentParser } from "fastify-file-interceptor";
import { Logger } from "nestjs-pino";

// Shared by main.ts and the e2e tests, so the tests run the app with the
// same setup as production

export const createAdapter = (): FastifyAdapter => new FastifyAdapter();

export const configureApp = async (
  app: NestFastifyApplication,
): Promise<NestFastifyApplication> => {
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.decorateRequest("user", null);
  fastifyInstance.addHook("preHandler", (req, reply, next) => {
    (req as typeof req & { user?: Partial<RequestJWTPayload> }).user =
      (req as typeof req & { user?: RequestJWTPayload }).user || {};
    next();
  });
  app.useLogger(app.get(Logger));

  const options = new DocumentBuilder()
    .setTitle("Exchange")
    .setVersion("0.1")
    .addSecurity("bearer", {
      type: "http",
      scheme: "bearer",
    })
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("swagger", app, document);

  await app.register(fastifyRequestContext);
  await app.register(contentParser);
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  return app;
};
