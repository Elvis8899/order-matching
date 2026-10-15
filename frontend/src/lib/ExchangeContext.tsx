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

// An order book level picked to fill an order form
export interface FormFill {
  price: string;
  amount: string;
}

interface ExchangeState {
  user: User | null;
  wallet: Wallet | null;
  // Rejects with an Error whose message can be shown to the user
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  stats: Stats;
  groupedAskOrders: PaginationHook<GroupedOrder>;
  groupedSellOrders: PaginationHook<GroupedOrder>;
  globalMatches: PaginationHook<Match>;
  myOrders: PaginationHook<Order>;
  myMatches: PaginationHook<Match>;
  // Price and amount are decimal strings, sent to the API as typed
  submitOrder: (
    side: "buy" | "sell",
    price: string,
    amount: string,
  ) => Promise<{ success: boolean; error?: string }>;
  cancelUserOrder: (orderId: string) => Promise<boolean>;
  refresh: () => void;
  fillFormAsk: FormFill | null;
  setFillFormAsk: (v: FormFill | null) => void;
  fillFormBuy: FormFill | null;
  setFillFormBuy: (v: FormFill | null) => void;
}

export const ExchangeContext = createContext<ExchangeState>(null!);

export function useExchange() {
  return useContext(ExchangeContext);
}
