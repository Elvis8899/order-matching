import * as request from "supertest";

import { HttpStatus } from "@nestjs/common";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";

const testModule = new E2EModule(() => ({}));

beforeAll(async () => {
  await testModule.init();
  const userBuilder = new UserBuilder();
  await testModule.prismaService.user.deleteMany();
  await testModule.prismaService.user.create({
    data: userBuilder.build(),
  });
});

afterAll(async () => {
  await testModule.prismaService.user.deleteMany();
  await testModule.close();
});

describe("[e2e] POST /v1/login", () => {
  const v1Route = "/v1/login";

  it("Should respond 201 for a valid login", async () => {
    const userInfo = new UserBuilder().buildCreateDTO();
    const response = await request(testModule.app.getHttpServer())
      .post(v1Route)
      .send(userInfo);
    expect(response.status).toBe(HttpStatus.OK);
  });

  it("Should respond 422 for invalid username", async () => {
    // Given a potentially valid user
    // with wrong email
    const userWrongUsername = new UserBuilder(0)
      .withUsername("")
      .buildCreateDTO();

    // When it tries to login
    const responseWrongUsername = await request(testModule.app.getHttpServer())
      .post(v1Route)
      .send(userWrongUsername);

    // Then it should respond 401
    expect(responseWrongUsername.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });
});
