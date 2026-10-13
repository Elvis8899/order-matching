import { authConfig } from "@auth/auth.config";
import { HttpStatus } from "@nestjs/common";
import { E2EModule } from "@test/util/defaultModule.e2e";

const testModule = new E2EModule(() => ({}));

beforeAll(async () => {
  await testModule.init();
});

afterAll(async () => {
  await testModule.close();
});

describe("[e2e] POST /v1/login rate limit", () => {
  const login = (username: string) =>
    testModule
      .request()
      .post("/v1/login")
      .send({ username, password: "wrong-password" });

  it("Should respond 429 after too many attempts for the same username", async () => {
    // Given the allowed number of failed attempts for one username
    for (let i = 0; i < authConfig.loginRateLimit; i++) {
      const response = await login("target");
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    }

    // Then the next attempt is throttled, regardless of case
    const throttled = await login("TARGET");
    expect(throttled.status).toBe(HttpStatus.TOO_MANY_REQUESTS);

    // And other accounts are not affected
    const otherUsername = await login("someone-else");
    expect(otherUsername.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});
