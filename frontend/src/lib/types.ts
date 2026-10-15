export interface User {
  id: string;
  username: string;
  role: "admin" | "client";
}
// Money arrives as decimal strings (e.g. "100.5") so no precision is lost
export interface Wallet {
  btc: string;
  usd: string;
}

export type OrderSide = "buy" | "sell";
export type OrderStatus = "active" | "partial" | "complete" | "cancelled";

export interface Order {
  id: string;
  userId: string;
  side: OrderSide;
  price: string; // USD per BTC
  amount: string; // BTC
  filled: string; // BTC filled so far
  status: OrderStatus;
  createdAt: number;
}

export interface Match {
  id: string;
  price: string;
  volume: string; // USD
  buyOrderId: string;
  sellOrderId: string;
  buyUserId: string;
  sellUserId: string;
  createdAt: number;
}

export interface GroupedOrder {
  price: string;
  amount: string;
  volume: string;
}

export interface Stats {
  lastPrice: string | null;
  btcVolume24h: string;
  usdVolume24h: string;
  high24h: string | null;
  low24h: string | null;
}

export interface PaginationOptions {
  limit?: number;
  page?: number;
}
export interface PaginatedResponse<Data> {
  count: number;
  limit: number;
  page: number;
  data: Data[];
}

export interface PaginationHook<U> {
  data: PaginatedResponse<U>;
  pages: number;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
  refresh: () => void;
  reset: () => void;
}
