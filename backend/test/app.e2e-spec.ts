import { HttpStatus } from "@nestjs/common";
import { E2EModule } from "@test/util/defaultModule.e2e";
import * as request from "supertest";

describe("AppController (e2e)", () => {
  const testModule = new E2EModule(() => ({}));

  beforeEach(async () => {
    await testModule.init();
  });

  afterEach(async () => {
    await testModule.close();
  });

  it("/check (GET)", () => {
    return request(testModule.app.getHttpServer())
      .get("/check/status")
      .expect(HttpStatus.OK)
      .expect("ok");
  });
});
