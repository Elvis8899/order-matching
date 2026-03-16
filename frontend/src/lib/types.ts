export interface User {
  id: string;
  username: string;
}
export interface Wallet {
  btc: number;
  usd: number;
}

export type OrderSide = "buy" | "sell";
export type OrderStatus = "active" | "partial" | "complete" | "cancelled";

export interface Order {
  id: string;
  userId: string;
  side: OrderSide;
  price: number; // USD per BTC
  amount: number; // BTC
  filled: number; // BTC filled so far
  status: OrderStatus;
  createdAt: number;
}

export interface Match {
  id: string;
  price: number;
  volume: number; // BTC
  buyOrderId: string;
  sellOrderId: string;
  buyUserId: string;
  sellUserId: string;
  createdAt: number;
}

export interface GroupedOrder {
  price: number;
  amount: number;
  volume: number;
}

export interface Stats {
  lastPrice: number | null;
  btcVolume24h: number;
  usdVolume24h: number;
  high24h: number | null;
  low24h: number | null;
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
