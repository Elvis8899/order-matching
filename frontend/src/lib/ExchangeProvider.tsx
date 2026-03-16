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
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [globalMatches, setMatches] = useState<Match[]>([]);
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
      ExchangeService.getOrdersPaginated(userId).then((res) => {
        setMyOrders(res.data.data);
      });
      ExchangeService.getMatchesPaginated(userId).then((res) => {
        setMyMatches(res.data.data);
      });
      ExchangeService.getWalletById().then((res) => setWallet(res.data));
    };

    const handleGlobalInfo = () => {
      ExchangeService.getMatchesPaginated().then((res) => {
        setMatches(res.data.data);
      });
      ExchangeService.getOrdersPaginated().then((res) => {
        setAllOrders(res.data.data);
      });
    };

    setTimeout(
      () => {
        console.log("tick", tick, user, userId);
        if (userId) {
          handleMyInfo();
          handleGlobalInfo();
          if (!socket.connected) socket.connect();
        }
      },
      tick ? 1000 : 0,
    );
  }, [user, userId, tick]);

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
    setMyMatches([]);
    setMyOrders([]);
  };

  const orderBook = getOrderBook(allOrders);

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
