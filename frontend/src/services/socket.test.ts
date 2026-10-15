import { io } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CredentialsStorage } from "@/services/credentials";

vi.mock("socket.io-client", () => ({ io: vi.fn(() => ({})) }));

describe("socket", () => {
  const load = async () => {
    vi.resetModules();
    await import("@/services/socket");
    return vi.mocked(io).mock.lastCall!;
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it("Should connect to the dev API on demand", async () => {
    const [url, options] = await load();

    expect(url).toBe("http://localhost:3000");
    expect(options).toMatchObject({
      path: "/v1/socket.io",
      autoConnect: false,
    });
  });

  it("Should connect to the page's own host in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const [url] = await load();

    expect(url).toBeUndefined();
  });

  it("Should send the current access token on each connection", async () => {
    const [, options] = await load();
    const auth = options!.auth as (cb: (data: object) => void) => void;
    const cb = vi.fn();

    auth(cb);
    CredentialsStorage.save({
      accessToken: "access-2",
      refreshToken: "refresh",
      user: { id: "id", username: "alice", role: "client" },
    });
    auth(cb);

    expect(cb).toHaveBeenNthCalledWith(1, { token: null });
    expect(cb).toHaveBeenNthCalledWith(2, { token: "access-2" });
  });
});
