import { getSecret } from "@auth/auth.config";

describe("[Unit] Auth config", () => {
  const envName = "TEST_AUTH_CONFIG_SECRET";

  afterEach(() => {
    delete process.env.TEST_AUTH_CONFIG_SECRET;
  });

  it("Should return the secret when it is long enough", () => {
    process.env[envName] = "a".repeat(32);

    expect(getSecret(envName)).toBe("a".repeat(32));
  });

  it("Should throw when the secret is missing", () => {
    expect(() => getSecret(envName)).toThrow(envName);
  });

  it("Should throw when the secret is too short", () => {
    process.env[envName] = "short";

    expect(() => getSecret(envName)).toThrow("at least 32 characters");
  });
});
