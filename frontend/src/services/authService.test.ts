import { AxiosError, AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "@/services/authService";
import { Credentials, CredentialsStorage } from "@/services/credentials";
import { UserService } from "@/services/userService";

const credentials: Credentials = {
  accessToken: "access",
  refreshToken: "refresh",
  user: { id: "user-id", username: "alice", role: "client" },
};

const ok = <T>(data: T) => ({ data }) as AxiosResponse<T>;
const httpError = (status: number) =>
  new AxiosError("error", undefined, undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);

describe("AuthService", () => {
  const login = vi.spyOn(UserService, "login");
  const createUser = vi.spyOn(UserService, "createUser");
  const logout = vi.spyOn(UserService, "logout");

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.resetAllMocks());

  it("Should log in and store the credentials", async () => {
    login.mockResolvedValue(ok(credentials));

    await expect(AuthService.login("alice", "password123")).resolves.toEqual(
      credentials.user,
    );

    expect(createUser).not.toHaveBeenCalled();
    expect(CredentialsStorage.getRefreshToken()).toBe("refresh");
  });

  it("Should sign up an unknown username, then log in", async () => {
    login
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce(ok(credentials));
    createUser.mockResolvedValue(ok(undefined));

    await AuthService.login("alice", "password123");

    expect(createUser).toHaveBeenCalledWith("alice", "password123");
    expect(login).toHaveBeenCalledTimes(2);
  });

  it.each([
    [409, "Wrong username or password"],
    [422, "Passwords need 8 to 72 characters"],
  ])("Should explain a %i on sign up", async (status, message) => {
    login.mockRejectedValue(httpError(401));
    createUser.mockRejectedValue(httpError(status));

    await expect(AuthService.login("alice", "short")).rejects.toThrow(message);
    expect(CredentialsStorage.getUser()).toBeNull();
  });

  it("Should pass on the server's message when login fails otherwise", async () => {
    const error = httpError(500);
    error.response!.data = { message: "Database unavailable" };
    login.mockRejectedValue(error);

    await expect(AuthService.login("alice", "password123")).rejects.toThrow(
      "Database unavailable",
    );
    expect(createUser).not.toHaveBeenCalled();
  });

  it("Should fall back to a generic message", async () => {
    login.mockRejectedValue(new Error("Network Error"));

    await expect(AuthService.login("alice", "password123")).rejects.toThrow(
      "Unable to login",
    );
  });

  it("Should explain a failed sign up without a reason", async () => {
    login.mockRejectedValue(httpError(401));
    createUser.mockRejectedValue(httpError(500));

    await expect(AuthService.login("alice", "password123")).rejects.toThrow(
      "Unable to register",
    );
  });

  it("Should explain a sign up that failed before reaching the server", async () => {
    login.mockRejectedValue(httpError(401));
    createUser.mockRejectedValue(new Error("Network Error"));

    await expect(AuthService.login("alice", "password123")).rejects.toThrow(
      "Unable to register",
    );
  });

  it("Should end the local session even when logout fails", async () => {
    CredentialsStorage.save(credentials);
    logout.mockRejectedValue(httpError(500));

    await AuthService.logout();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(AuthService.getUser()).toBeNull();
  });
});
