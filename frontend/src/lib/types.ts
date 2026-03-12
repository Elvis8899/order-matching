export interface User {
  id: string;
  username: string;
  btcBalance: number;
  usdBalance: number;
}

export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'active' | 'partial' | 'complete' | 'cancelled';

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

export interface OrderBookLevel {
  price: number;
  volume: number;
}

export interface Stats {
  lastPrice: number | null;
  btcVolume24h: number;
  usdVolume24h: number;
  high24h: number | null;
  low24h: number | null;
}
