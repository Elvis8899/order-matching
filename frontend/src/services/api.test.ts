import axios, {
  AxiosAdapter,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, onSessionExpired } from "@/services/api";
import { Credentials, CredentialsStorage } from "@/services/credentials";

const credentials = (n: number): Credentials => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  user: { id: "user-id", username: "alice", role: "client" },
});

const response = (
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = {},
): AxiosResponse => ({ config, status, statusText: "", headers: {}, data });

const reject = (config: InternalAxiosRequestConfig, status: number) =>
  Promise.reject(
    new AxiosError(
      "error",
      undefined,
      config,
      undefined,
      response(config, status),
    ),
  );

// The API accepts only the given access token
const acceptOnly =
  (token: string): AxiosAdapter =>
  async (config) =>
    config.headers["authorization"] === `Bearer ${token}`
      ? response(config, 200, { ok: true })
      : reject(config, 401);

describe("http token refresh", () => {
  const originalAdapter = http.defaults.adapter;
  const refresh = vi.spyOn(axios, "post");

  beforeEach(() => {
    localStorage.clear();
    CredentialsStorage.save(credentials(1));
  });

  afterEach(() => {
    http.defaults.adapter = originalAdapter;
    refresh.mockReset();
  });

  it("Should refresh an expired access token once and retry", async () => {
    http.defaults.adapter = acceptOnly("access-2");
    refresh.mockResolvedValue({ data: credentials(2) });

    const res = await http.get("orders");

    expect(res.data).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(expect.stringMatching(/\/refresh$/), {
      refreshToken: "refresh-1",
    });
    expect(CredentialsStorage.getRefreshToken()).toBe("refresh-2");
  });

  it("Should share one refresh between concurrent requests", async () => {
    http.defaults.adapter = acceptOnly("access-2");
    refresh.mockResolvedValue({ data: credentials(2) });

    await Promise.all([http.get("orders"), http.get("wallet")]);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("Should use a token another tab refreshed, without refreshing again", async () => {
    // The request is sent with access-1, and another tab refreshes meanwhile
    http.defaults.adapter = async (config) => {
      if (config.headers["authorization"] === "Bearer access-1") {
        CredentialsStorage.save(credentials(2));
        return reject(config, 401);
      }
      return acceptOnly("access-2")(config);
    };

    const res = await http.get("orders");

    expect(res.status).toBe(200);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("Should end the session when the refresh token is rejected", async () => {
    http.defaults.adapter = acceptOnly("access-2");
    refresh.mockImplementation((url) =>
      reject({ url, headers: {} } as InternalAxiosRequestConfig, 401),
    );
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);

    await expect(http.get("orders")).rejects.toThrow();

    expect(expired).toHaveBeenCalledTimes(1);
    expect(CredentialsStorage.getUser()).toBeNull();
    unsubscribe();
  });

  it("Should not refresh after a failed login", async () => {
    http.defaults.adapter = async (config) => reject(config, 401);

    await expect(http.post("/login", {})).rejects.toThrow();

    expect(refresh).not.toHaveBeenCalled();
  });
});
