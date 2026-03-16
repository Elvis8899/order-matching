import { createContext, useContext } from "react";
import {
  User,
  Order,
  Match,
  Stats,
  Wallet,
  PaginationHook,
  GroupedOrder,
} from "./types";

interface ExchangeState {
  user: User | null;
  wallet: Wallet | null;
  login: (username: string) => void;
  logout: () => void;
  stats: Stats;
  groupedAskOrders: PaginationHook<GroupedOrder>;
  groupedSellOrders: PaginationHook<GroupedOrder>;
  globalMatches: PaginationHook<Match>;
  myOrders: PaginationHook<Order>;
  myMatches: PaginationHook<Match>;
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
