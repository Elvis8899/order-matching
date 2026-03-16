import React, { useState, useEffect, useCallback } from "react";
import {
  GroupedOrder,
  Match,
  Order,
  PaginationOptions,
  Stats,
  User,
  Wallet,
} from "./types";
import { subscribe } from "./exchange";
import { AuthService } from "@/services/authService";
import { ExchangeService } from "@/services/exchangeService";
import { ExchangeContext } from "@/lib/ExchangeContext";
import { socket } from "@/services/socket";
import { defaultPaginatedResponse, usePaginatedHook } from "@/lib/utils";

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(AuthService.getUser());
  const [stats, setStats] = useState<Stats>({
    btcVolume24h: 0,
    usdVolume24h: 0,
    lastPrice: null,
    high24h: null,
    low24h: null,
  });
  const myOrders = usePaginatedHook<Order>(
    useCallback(
      (options: PaginationOptions) =>
        user
          ? ExchangeService.getOrdersPaginated(user?.id, options).then(
              (res) => res.data,
            )
          : Promise.resolve(defaultPaginatedResponse()),
      [user],
    ),
  );
  const groupedAskOrders = usePaginatedHook<GroupedOrder>(
    useCallback(
      (options: PaginationOptions) =>
        ExchangeService.getGroupedOrdersPaginated("buy", options).then(
          (res) => res.data,
        ),
      [],
    ),
  );
  const groupedSellOrders = usePaginatedHook<GroupedOrder>(
    useCallback(
      (options: PaginationOptions) =>
        ExchangeService.getGroupedOrdersPaginated("sell", options).then(
          (res) => res.data,
        ),
      [],
    ),
  );
  const myMatches = usePaginatedHook<Match>(
    useCallback(
      (options: PaginationOptions) =>
        user
          ? ExchangeService.getMatchesPaginated(user?.id, options).then(
              (res) => res.data,
            )
          : Promise.resolve(defaultPaginatedResponse()),
      [user],
    ),
  );
  const globalMatches = usePaginatedHook<Match>(
    useCallback(
      (options: PaginationOptions) =>
        ExchangeService.getMatchesPaginated(undefined, options).then(
          (res) => res.data,
        ),
      [],
    ),
  );
  const [wallet, setWallet] = useState<Wallet>({ btc: 0, usd: 0 });
  const [tick, setTick] = useState(0);
  const [fillFormAsk, setFillFormAsk] = useState<{
    price: number;
    amount: number;
  } | null>(null);
  const [fillFormBuy, setFillFormBuy] = useState<{
    price: number;
    amount: number;
  } | null>(null);
  let userId = user?.id;
  useEffect(() => {
    // no-op if the socket is already connected
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    function onStatisticsEvent(value: Stats) {
      setStats(value);
    }

    socket.on("socket.match.created", onStatisticsEvent);

    return () => {
      socket.off("socket.match.created", onStatisticsEvent);
    };
  }, []);
  const refresh = useCallback(() => {
    setTick((t) => t + 1);

    const handleMyInfo = () => {
      myOrders.refresh();
      myMatches.refresh();
      ExchangeService.getWalletById().then((res) => setWallet(res.data));
    };

    const handleGlobalInfo = () => {
      globalMatches.refresh();
      groupedAskOrders.refresh();
      groupedSellOrders.refresh();
    };

    setTimeout(
      () => {
        if (userId) {
          handleMyInfo();
          handleGlobalInfo();
          if (!socket.connected) socket.connect();
        }
      },
      tick ? 1000 : 0,
    );
  }, [
    userId,
    tick,
    globalMatches,
    myMatches,
    myOrders,
    groupedAskOrders,
    groupedSellOrders,
  ]);

  const handleStatistics = () => {
    ExchangeService.matchStatistics().then((res) => {
      setStats(res.data);
    });
  };

  // Refresh On f5
  if (user && tick === 0) {
    refresh();
    handleStatistics();
  }
  useEffect(() => subscribe(refresh), [refresh]);

  const handleLogin = async (username: string) => {
    const userFromLogin = await AuthService.login(username);
    setUser(userFromLogin);
    userId = userFromLogin.id;
    socket.connect();
    refresh();
  };

  const handleLogout = () => {
    AuthService.logout();
    socket.disconnect();
    setUser(null);
    setWallet({ btc: 0, usd: 0 });
    myOrders.reset();
    myMatches.reset();
    globalMatches.reset();
  };

  const submitOrder = async (
    side: "buy" | "sell",
    price: number,
    amount: number,
  ) => {
    if (!user) return { success: false, error: "Not logged in" };
    const resultPromise = await ExchangeService.createOrder({
      userId: user.id,
      side,
      price,
      amount,
    }).catch(
      (e) => e.response as { status: number; data: { message: string } },
    );
    const success = resultPromise.status === 201;
    const error = resultPromise.data && resultPromise.data.message;
    if (success) refresh();
    return { success, error };
  };

  const cancelUserOrder = async (orderId: string) => {
    if (!user) return false;
    const result = await ExchangeService.cancelOrder(orderId);
    const success = result.status === 200;
    if (success) refresh();
    return success;
  };

  // Force re-read on tick change
  void tick;
  return (
    <ExchangeContext.Provider
      value={{
        user: user,
        wallet,
        login: handleLogin,
        logout: handleLogout,
        stats,
        groupedAskOrders,
        groupedSellOrders,
        globalMatches,
        myOrders,
        myMatches,
        submitOrder,
        cancelUserOrder,
        refresh,
        fillFormAsk,
        setFillFormAsk,
        fillFormBuy,
        setFillFormBuy,
      }}
    >
      {children}
    </ExchangeContext.Provider>
  );
}
