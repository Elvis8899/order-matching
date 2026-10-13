import { HttpStatus } from "@nestjs/common";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";

const testModule = new E2EModule(() => ({}));

beforeAll(async () => {
  await testModule.init();
  await testModule.prismaService.user.deleteMany();
  await testModule.prismaService.user.create({
    data: await new UserBuilder().buildWithHashedPassword(),
  });
});

afterAll(async () => {
  await testModule.prismaService.user.deleteMany();
  await testModule.close();
});

describe("[e2e] POST /v1/login", () => {
  const v1Route = "/v1/login";

  it("Should respond 200 for a valid login", async () => {
    const userInfo = new UserBuilder().buildCreateDTO();
    const response = await testModule.request().post(v1Route).send(userInfo);
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body?.user).toEqual({
      id: new UserBuilder().build().id,
      username: userInfo.username,
      role: "client",
    });
  });

  it("Should respond 422 for an empty username", async () => {
    const response = await testModule
      .request()
      .post(v1Route)
      .send(new UserBuilder().withUsername("").buildCreateDTO());
    expect(response.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it("Should respond 401 for invalid username or password", async () => {
    // Given a potentially valid user
    // with wrong username
    const userWrongUsername = new UserBuilder(0)
      .withUsername("someone-else")
      .buildCreateDTO();

    // or with wrong password
    const userWrongPassword = new UserBuilder(0)
      .withPassword("wrong-password")
      .buildCreateDTO();

    // When it tries to login
    const responseWrongUsername = await testModule
      .request()
      .post(v1Route)
      .send(userWrongUsername);
    const responseWrongPassword = await testModule
      .request()
      .post(v1Route)
      .send(userWrongPassword);

    // Then it should respond 401
    expect(responseWrongUsername.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(responseWrongPassword.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});

describe("[e2e] POST /v1/refresh", () => {
  const v1Route = "/v1/refresh";

  it("Should respond 200 with new tokens for a valid refresh token", async () => {
    // Given a logged in user
    const login = await testModule
      .request()
      .post("/v1/login")
      .send(new UserBuilder().buildCreateDTO());
    const { refreshToken } = login.body as { refreshToken: string };

    // When it refreshes its tokens
    const response = await testModule
      .request()
      .post(v1Route)
      .send({ refreshToken });

    // Then it should receive new tokens
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body?.accessToken).toBeTruthy();
    expect(response.body?.refreshToken).toBeTruthy();
  });

  it("Should accept a refresh token only once", async () => {
    // Given a refresh token that was already exchanged
    const login = await testModule
      .request()
      .post("/v1/login")
      .send(new UserBuilder().buildCreateDTO());
    const { refreshToken } = login.body as { refreshToken: string };
    const rotated = await testModule
      .request()
      .post(v1Route)
      .send({ refreshToken });

    // When it is used again
    const reuse = await testModule
      .request()
      .post(v1Route)
      .send({ refreshToken });

    // Then it is rejected, and the session is revoked
    expect(rotated.status).toBe(HttpStatus.OK);
    expect(reuse.status).toBe(HttpStatus.UNAUTHORIZED);
    const afterReuse = await testModule
      .request()
      .post(v1Route)
      .send(rotated.body as { refreshToken: string });
    expect(afterReuse.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it("Should respond 401 for an invalid refresh token", async () => {
    const response = await testModule
      .request()
      .post(v1Route)
      .send({ refreshToken: "not-a-jwt" });
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});

describe("[e2e] POST /v1/logout", () => {
  it("Should revoke refresh tokens issued before logout", async () => {
    // Given a logged in user whose refresh token works
    const userInfo = new UserBuilder().buildCreateDTO();
    const login = await testModule.request().post("/v1/login").send(userInfo);
    const { refreshToken, user } = login.body as {
      refreshToken: string;
      user: { id: string };
    };

    // When the user logs out
    testModule.authGuard.withSub(user.id);
    const logout = await testModule.request().post("/v1/logout");
    testModule.authGuard.reset();

    // Then the old refresh token is rejected
    expect(logout.status).toBe(HttpStatus.NO_CONTENT);
    const refresh = await testModule
      .request()
      .post("/v1/refresh")
      .send({ refreshToken });
    expect(refresh.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});
