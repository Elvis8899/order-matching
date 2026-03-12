import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Order, Match, OrderBookLevel, Stats } from './types';
import { getSession, login as authLogin, logout as authLogout, getUserBalance } from './auth';
import { getOrderBook, getStats, getUserOrders, getUserMatches, getMatches, placeOrder, cancelOrder, subscribe } from './exchange';

interface ExchangeState {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
  stats: Stats;
  orderBook: { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
  globalMatches: Match[];
  myOrders: Order[];
  myMatches: Match[];
  submitOrder: (side: 'buy' | 'sell', price: number, amount: number) => { success: boolean; error?: string };
  cancelUserOrder: (orderId: string) => boolean;
  refresh: () => void;
  fillForm: { price: number; amount: number } | null;
  setFillForm: (v: { price: number; amount: number } | null) => void;
}

const ExchangeContext = createContext<ExchangeState>(null!);

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getSession);
  const [tick, setTick] = useState(0);
  const [fillForm, setFillForm] = useState<{ price: number; amount: number } | null>(null);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => subscribe(refresh), [refresh]);

  const handleLogin = (username: string) => {
    const result = authLogin(username);
    setUser(result.user);
  };

  const handleLogout = () => {
    authLogout();
    setUser(null);
  };

  // Refresh user balance
  const currentUser = user ? { ...user, ...getUserBalance(user.id), btcBalance: getUserBalance(user.id).btc, usdBalance: getUserBalance(user.id).usd } : null;

  const stats = getStats();
  const orderBook = getOrderBook();
  const globalMatches = getMatches().slice().reverse().slice(0, 50);
  const myOrders = user ? getUserOrders(user.id) : [];
  const myMatches = user ? getUserMatches(user.id).slice().reverse().slice(0, 50) : [];

  const submitOrder = (side: 'buy' | 'sell', price: number, amount: number) => {
    if (!user) return { success: false, error: 'Not logged in' };
    const result = placeOrder(user.id, side, price, amount);
    if (result.success) refresh();
    return result;
  };

  const cancelUserOrder = (orderId: string) => {
    if (!user) return false;
    const result = cancelOrder(orderId, user.id);
    if (result) refresh();
    return result;
  };

  // Force re-read on tick change
  void tick;

  return (
    <ExchangeContext.Provider value={{
      user: currentUser,
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
    }}>
      {children}
    </ExchangeContext.Provider>
  );
}

export function useExchange() {
  return useContext(ExchangeContext);
}
