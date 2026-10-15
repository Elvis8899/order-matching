import { act, render, waitFor } from "@testing-library/react";
import axios, { AxiosError, AxiosResponse } from "axios";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExchangeContext } from "@/lib/ExchangeContext";
import { ExchangeProvider } from "@/lib/ExchangeProvider";
import { Stats } from "@/lib/types";
import { refreshAccessToken } from "@/services/api";
import { AuthService } from "@/services/authService";
import { CredentialsStorage, USER_KEY } from "@/services/credentials";
import { ExchangeService } from "@/services/exchangeService";
import { alice } from "@/test/exchangeContext";
import { socket } from "@/test/fakeSocket";

vi.mock("@/services/socket", () => import("@/test/fakeSocket"));
vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  refreshAccessToken: vi.fn(),
}));

const ok = <T,>(data: T, status = 200) => ({ data, status }) as AxiosResponse<T>;
const page = <T,>(data: T[] = []) => ok({ data, count: data.length, limit: 10, page: 0 });
const stats: Stats = {
  lastPrice: 30000,
  btcVolume24h: 1,
  usdVolume24h: 30000,
  high24h: 30000,
  low24h: 30000,
};

describe("ExchangeProvider", () => {
  let state: React.ContextType<typeof ExchangeContext>;
  const Consumer = () => {
    state = useContext(ExchangeContext);
    return null;
  };
  // Lets pending loads finish, including the refresh deferred by setTimeout
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 10)));
  const renderProvider = async () => {
    render(
      <ExchangeProvider>
        <Consumer />
      </ExchangeProvider>,
    );
    await settle();
  };
  const storageEvent = async (key: string | null) => {
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key }));
    });
    await settle();
  };

  const exchange = {
    wallet: vi.spyOn(ExchangeService, "getWalletById"),
    orders: vi.spyOn(ExchangeService, "getOrdersPaginated"),
    matches: vi.spyOn(ExchangeService, "getMatchesPaginated"),
    grouped: vi.spyOn(ExchangeService, "getGroupedOrdersPaginated"),
    statistics: vi.spyOn(ExchangeService, "matchStatistics"),
    createOrder: vi.spyOn(ExchangeService, "createOrder"),
    cancelOrder: vi.spyOn(ExchangeService, "cancelOrder"),
  };
  const auth = {
    login: vi.spyOn(AuthService, "login"),
    logout: vi.spyOn(AuthService, "logout"),
  };

  const logInStored = () =>
    CredentialsStorage.save({
      accessToken: "access",
      refreshToken: "refresh",
      user: alice,
    });

  beforeEach(() => {
    localStorage.clear();
    exchange.wallet.mockResolvedValue(ok({ btc: 1, usd: 100 }));
    exchange.orders.mockResolvedValue(page());
    exchange.matches.mockResolvedValue(page());
    exchange.grouped.mockResolvedValue(page());
    exchange.statistics.mockResolvedValue(ok(stats));
    auth.logout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.post).mockRestore?.();
    socket.reset();
  });

  describe("When logged out", () => {
    it("Should load only the public data", async () => {
      await renderProvider();

      expect(state.user).toBeNull();
      expect(socket.connect).toHaveBeenCalled();
      await waitFor(() => expect(exchange.grouped).toHaveBeenCalledTimes(2));
      expect(exchange.grouped).toHaveBeenCalledWith("buy", { page: 0, limit: 10 });
      expect(exchange.grouped).toHaveBeenCalledWith("sell", { page: 0, limit: 10 });
      expect(exchange.matches).toHaveBeenCalledWith(undefined, { page: 0, limit: 10 });
      expect(exchange.orders).not.toHaveBeenCalled();
      expect(exchange.wallet).not.toHaveBeenCalled();
    });

    it("Should not send orders", async () => {
      await renderProvider();

      await expect(state.submitOrder("buy", 1, 1)).resolves.toEqual({
        success: false,
        error: "Not logged in",
      });
      await expect(state.cancelUserOrder("order-1")).resolves.toBe(false);
      expect(exchange.createOrder).not.toHaveBeenCalled();
      expect(exchange.cancelOrder).not.toHaveBeenCalled();
    });

    it("Should log in and load the user's data", async () => {
      auth.login.mockResolvedValue(alice);
      await renderProvider();

      await act(() => state.login("alice", "password123"));

      expect(auth.login).toHaveBeenCalledWith("alice", "password123");
      expect(state.user).toEqual(alice);
      await waitFor(() => expect(state.wallet).toEqual({ btc: 1, usd: 100 }));
      expect(exchange.orders).toHaveBeenCalledWith(alice.id, { page: 0, limit: 10 });
      expect(exchange.matches).toHaveBeenCalledWith(alice.id, { page: 0, limit: 10 });
    });

    it("Should pass on a failed login", async () => {
      auth.login.mockRejectedValue(new Error("Wrong username or password"));
      await renderProvider();

      await expect(state.login("alice", "wrong")).rejects.toThrow(
        "Wrong username or password",
      );
      expect(state.user).toBeNull();
    });

    it("Should follow a login made in another tab", async () => {
      await renderProvider();

      logInStored();
      await storageEvent(USER_KEY);

      expect(state.user).toEqual(alice);
    });

    it("Should ignore other storage changes", async () => {
      await renderProvider();

      logInStored();
      await storageEvent("theme");

      expect(state.user).toBeNull();
    });
  });

  describe("When logged in", () => {
    beforeEach(logInStored);

    it("Should load the user's data and the statistics on startup", async () => {
      await renderProvider();

      expect(state.user).toEqual(alice);
      await waitFor(() => expect(state.wallet).toEqual({ btc: 1, usd: 100 }));
      await waitFor(() => expect(state.stats).toEqual(stats));
      expect(exchange.orders).toHaveBeenCalledWith(alice.id, { page: 0, limit: 10 });
    });

    it("Should reconnect a dropped socket when refreshing", async () => {
      await renderProvider();
      socket.connected = false;
      socket.connect.mockClear();

      // Later refreshes wait a second, so bursts of updates are merged
      act(() => state.refresh());

      await waitFor(() => expect(socket.connect).toHaveBeenCalledTimes(1), {
        timeout: 2000,
      });
    });

    it("Should update the statistics from the socket", async () => {
      await renderProvider();
      const latest = { ...stats, lastPrice: 31000 };

      act(() => socket.emit("socket.match.created", latest));

      expect(state.stats).toEqual(latest);
    });

    it("Should place an order", async () => {
      exchange.createOrder.mockResolvedValue(ok(undefined, 201));
      await renderProvider();

      await act(async () => {
        await expect(state.submitOrder("sell", 30000, 0.5)).resolves.toEqual({
          success: true,
          error: undefined,
        });
      });
      expect(exchange.createOrder).toHaveBeenCalledWith({
        userId: alice.id,
        side: "sell",
        price: 30000,
        amount: 0.5,
      });
    });

    it("Should return the server's reason for a rejected order", async () => {
      exchange.createOrder.mockRejectedValue(
        new AxiosError("error", undefined, undefined, undefined, {
          status: 422,
          data: { message: "Insufficient funds" },
        } as AxiosResponse),
      );
      await renderProvider();

      await expect(state.submitOrder("buy", 30000, 100)).resolves.toEqual({
        success: false,
        error: "Insufficient funds",
      });
    });

    it.each([
      ["cancelled", () => Promise.resolve(ok(undefined)), true],
      ["refused", () => Promise.reject(new AxiosError("error")), false],
    ])("Should report an order the server %s", async (_, response, result) => {
      exchange.cancelOrder.mockImplementation(response);
      await renderProvider();

      await act(async () => {
        await expect(state.cancelUserOrder("order-1")).resolves.toBe(result);
      });
      expect(exchange.cancelOrder).toHaveBeenCalledWith("order-1");
    });

    it("Should log out", async () => {
      await renderProvider();

      act(() => state.logout());
      await settle();

      expect(auth.logout).toHaveBeenCalled();
      expect(socket.disconnect).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.wallet).toEqual({ btc: 0, usd: 0 });
    });

    it("Should end the session when the refresh token is rejected", async () => {
      vi.spyOn(axios, "post").mockRejectedValue(
        new AxiosError("error", undefined, undefined, undefined, {
          status: 401,
        } as AxiosResponse),
      );
      // The mock above only replaces the export used for the socket
      const api = await vi.importActual<typeof import("@/services/api")>(
        "@/services/api",
      );
      await renderProvider();

      await act(() => api.refreshAccessToken("access"));

      expect(state.user).toBeNull();
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it("Should end the session when another tab clears the storage", async () => {
      await renderProvider();

      localStorage.clear();
      await storageEvent(null);

      expect(state.user).toBeNull();
    });

    it("Should follow a logout made in another tab", async () => {
      await renderProvider();

      CredentialsStorage.clear();
      await storageEvent(USER_KEY);

      expect(state.user).toBeNull();
      expect(socket.disconnect).toHaveBeenCalled();
    });
  });

  describe("When the socket's token has expired", () => {
    const rejectToken = () =>
      act(() => socket.emit("connect_error", new Error("Unauthorized")));

    it("Should refresh the token and reconnect, once", async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue("access-2");
      await renderProvider();
      socket.connect.mockClear();

      rejectToken();
      rejectToken();

      await waitFor(() => expect(socket.connect).toHaveBeenCalledTimes(1));
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });

    it("Should retry again after a successful connection", async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue("access-2");
      await renderProvider();

      rejectToken();
      act(() => socket.emit("connect"));
      rejectToken();

      expect(refreshAccessToken).toHaveBeenCalledTimes(2);
    });

    it("Should not reconnect when the session is over", async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue(null);
      await renderProvider();
      socket.connect.mockClear();

      rejectToken();

      await waitFor(() => expect(refreshAccessToken).toHaveBeenCalled());
      expect(socket.connect).not.toHaveBeenCalled();
    });

    it("Should ignore other connection errors", async () => {
      await renderProvider();

      act(() => socket.emit("connect_error", new Error("xhr poll error")));

      expect(refreshAccessToken).not.toHaveBeenCalled();
    });
  });
});
