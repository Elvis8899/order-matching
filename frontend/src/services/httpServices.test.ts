import { InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http } from "@/services/api";
import { ExchangeService } from "@/services/exchangeService";
import { UserService } from "@/services/userService";

// Pins each call to its backend route: records the requests and answers 200
describe("HTTP services", () => {
  const originalAdapter = http.defaults.adapter;
  let requests: InternalAxiosRequestConfig[];

  const lastRequest = () => {
    const { method, url, params, data } = requests[requests.length - 1];
    return { method, url, params, body: data && JSON.parse(data) };
  };

  beforeEach(() => {
    requests = [];
    http.defaults.adapter = async (config) => {
      requests.push(config);
      return { config, status: 200, statusText: "", headers: {}, data: {} };
    };
  });

  afterEach(() => {
    http.defaults.adapter = originalAdapter;
  });

  describe("ExchangeService", () => {
    it("Should get the wallet", async () => {
      await ExchangeService.getWalletById();
      expect(lastRequest()).toMatchObject({ method: "get", url: "wallet" });
    });

    it("Should create an order", async () => {
      const order = { userId: "u", side: "buy" as const, price: "1", amount: "2" };
      await ExchangeService.createOrder(order);
      expect(lastRequest()).toMatchObject({
        method: "post",
        url: "orders",
        body: order,
      });
    });

    it("Should get the first page of orders by default", async () => {
      await ExchangeService.getOrdersPaginated("u");
      expect(lastRequest()).toMatchObject({
        method: "get",
        url: "orders",
        params: { page: 0, limit: 10, userId: "u" },
      });
    });

    it("Should get a page of matches", async () => {
      await ExchangeService.getMatchesPaginated(undefined, {
        page: 2,
        limit: 5,
      });
      expect(lastRequest()).toMatchObject({
        method: "get",
        url: "matches",
        params: { page: 2, limit: 5, userId: undefined },
      });
    });

    it("Should get the default page of matches", async () => {
      await ExchangeService.getMatchesPaginated("u");
      expect(lastRequest().params).toEqual({ page: 0, limit: 10, userId: "u" });
    });

    it.each(["buy", "sell"] as const)(
      "Should get the %s side of the order book",
      async (side) => {
        await ExchangeService.getGroupedOrdersPaginated(side);
        expect(lastRequest()).toMatchObject({
          method: "get",
          url: "orders/grouped",
          params: { page: 0, limit: 10, side },
        });
      },
    );

    it("Should cancel an order", async () => {
      await ExchangeService.cancelOrder("order-1");
      expect(lastRequest()).toMatchObject({
        method: "delete",
        url: "orders/order-1",
      });
    });

    it("Should get the match statistics", async () => {
      await ExchangeService.matchStatistics();
      expect(lastRequest()).toMatchObject({
        method: "get",
        url: "match/statistics",
      });
    });
  });

  describe("UserService", () => {
    it("Should log in", async () => {
      await UserService.login("alice", "password123");
      expect(lastRequest()).toMatchObject({
        method: "post",
        url: "/login",
        body: { username: "alice", password: "password123" },
      });
    });

    it("Should create a user", async () => {
      await UserService.createUser("alice", "password123");
      expect(lastRequest()).toMatchObject({
        method: "post",
        url: "/users",
        body: { username: "alice", password: "password123" },
      });
    });

    it("Should log out", async () => {
      await UserService.logout();
      expect(lastRequest()).toMatchObject({ method: "post", url: "/logout" });
    });
  });
});
