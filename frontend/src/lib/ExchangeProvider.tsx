import React, { useState, useEffect, useCallback } from "react";
import { Match, Order, Stats, User, Wallet } from "./types";
import { getOrderBook, subscribe } from "./exchange";
import { AuthService } from "@/services/authService";
import { ExchangeService } from "@/services/exchangeService";
import { ExchangeContext } from "@/lib/ExchangeContext";
import { socket } from "@/services/socket";

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(AuthService.getUser());
  const [stats, setStats] = useState<Stats>({
    btcVolume24h: 0,
    usdVolume24h: 0,
    lastPrice: null,
    high24h: null,
    low24h: null,
  });
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [globalMatches, setMatches] = useState<Match[]>([]);
  const [wallet, setWallet] = useState<Wallet>({ btc: 0, usd: 0 });
  const [tick, setTick] = useState(0);
  const [fillForm, setFillForm] = useState<{
    price: number;
    amount: number;
  } | null>(null);

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

    socket.on("post.match.statistics", onStatisticsEvent);

    return () => {
      socket.off("post.match.statistics", onStatisticsEvent);
    };
  }, []);
  const refresh = useCallback(() => {
    setTick((t) => t + 1);

    const handleMyOrders = () =>
      ExchangeService.getOrdersPaginated(user?.id).then((res) => {
        setMyOrders(res.data.data);
      });
    const handleMatches = () =>
      ExchangeService.getMatchesPaginated().then((res) => {
        setMatches(res.data.data);
      });
    const handleWallet = () =>
      ExchangeService.getWalletById().then((res) => setWallet(res.data));
    const handleMyMatches = () =>
      ExchangeService.getMatchesPaginated(user?.id).then((res) => {
        setMyMatches(res.data.data);
      });
    setTimeout(() => {
      handleMyOrders();
      handleWallet();
      handleMatches();
      handleMyMatches();
      if (!socket.connected) socket.connect();
    }, 1000);
  }, [user]);

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
    const user = await AuthService.login(username);
    setUser(user);
    socket.connect();
    refresh();
  };

  const handleLogout = () => {
    AuthService.logout();
    socket.disconnect();
    setUser(null);
  };

  const orderBook = getOrderBook(myOrders);

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
    console.log(result.status);
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
        orderBook,
        globalMatches,
        myOrders,
        myMatches,
        submitOrder,
        cancelUserOrder,
        refresh,
        fillForm,
        setFillForm,
      }}
    >
      {children}
    </ExchangeContext.Provider>
  );
}
