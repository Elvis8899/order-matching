import { createContext, useContext } from "react";
import { User, Order, Match, OrderBookLevel, Stats, Wallet } from "./types";

interface ExchangeState {
  user: User | null;
  wallet: Wallet | null;
  login: (username: string) => void;
  logout: () => void;
  stats: Stats;
  orderBook: { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
  globalMatches: Match[];
  myOrders: Order[];
  myMatches: Match[];
  submitOrder: (
    side: "buy" | "sell",
    price: number,
    amount: number,
  ) => Promise<{ success: boolean; error?: string }>;
  cancelUserOrder: (orderId: string) => Promise<boolean>;
  refresh: () => void;
  fillFormAsk: { price: number; amount: number } | null;
  setFillFormAsk: (v: { price: number; amount: number } | null) => void;
  fillFormBuy: { price: number; amount: number } | null;
  setFillFormBuy: (v: { price: number; amount: number } | null) => void;
}

export const ExchangeContext = createContext<ExchangeState>(null!);

export function useExchange() {
  return useContext(ExchangeContext);
}
