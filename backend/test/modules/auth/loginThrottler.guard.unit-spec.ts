import { LoginThrottlerGuard } from "@auth/guards/loginThrottler.guard";
import { Reflector } from "@nestjs/core";
import { ThrottlerStorageService } from "@nestjs/throttler";

// Exposes the protected tracker so its key can be checked directly
class TestableLoginThrottlerGuard extends LoginThrottlerGuard {
  tracker(req: { ip?: string; body?: { username?: unknown } }) {
    return this.getTracker(req);
  }
}

describe("[Unit] LoginThrottlerGuard", () => {
  const guard = new TestableLoginThrottlerGuard(
    { throttlers: [] },
    new ThrottlerStorageService(),
    new Reflector(),
  );

  it.each([
    [
      "IP and lowercased username",
      { ip: "10.0.0.1", body: { username: "Alice" } },
      "10.0.0.1:alice",
    ],
    ["missing username", { ip: "10.0.0.1", body: {} }, "10.0.0.1:"],
    [
      "non-string username",
      { ip: "10.0.0.1", body: { username: 42 } },
      "10.0.0.1:",
    ],
    ["missing body and IP", {}, ":"],
  ])("Should track by %s", async (_: string, req, expected: string) => {
    await expect(guard.tracker(req)).resolves.toBe(expected);
  });
});
