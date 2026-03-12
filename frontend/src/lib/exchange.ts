import { Order, Match, OrderSide, OrderBookLevel, Stats } from './types';
import { updateUserBalance, getUserBalance } from './auth';

const ORDERS_KEY = 'exchange_orders';
const MATCHES_KEY = 'exchange_matches';

const MAKER_FEE = 0.005; // 0.5%
const TAKER_FEE = 0.003; // 0.3%

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function getOrders(): Order[] {
  const data = localStorage.getItem(ORDERS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function getMatches(): Match[] {
  const data = localStorage.getItem(MATCHES_KEY);
  return data ? JSON.parse(data) : [];
}

function saveMatches(matches: Match[]) {
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

// listeners for real-time updates
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach(fn => fn());
}

export function placeOrder(userId: string, side: OrderSide, price: number, amount: number): { success: boolean; error?: string } {
  // Validate balance
  const balance = getUserBalance(userId);
  if (side === 'buy') {
    const totalCost = price * amount;
    if (totalCost > balance.usd) return { success: false, error: 'Insufficient USD balance' };
  } else {
    if (amount > balance.btc) return { success: false, error: 'Insufficient BTC balance' };
  }

  // Reserve funds
  if (side === 'buy') {
    updateUserBalance(userId, 0, -(price * amount));
  } else {
    updateUserBalance(userId, -amount, 0);
  }

  const order: Order = {
    id: generateId(),
    userId,
    side,
    price,
    amount,
    filled: 0,
    status: 'active',
    createdAt: Date.now(),
  };

  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);

  // Run matching engine
  matchOrder(order.id);
  notify();
  return { success: true };
}

function matchOrder(newOrderId: string) {
  const orders = getOrders();
  const matches = getMatches();
  const newOrder = orders.find(o => o.id === newOrderId);
  if (!newOrder || newOrder.status === 'complete' || newOrder.status === 'cancelled') return;

  const remaining = () => newOrder.amount - newOrder.filled;

  // Find opposing orders
  const opposingSide = newOrder.side === 'buy' ? 'sell' : 'buy';
  const candidates = orders
    .filter(o => o.side === opposingSide && (o.status === 'active' || o.status === 'partial'))
    .filter(o => {
      if (newOrder.side === 'buy') return o.price <= newOrder.price;
      return o.price >= newOrder.price;
    })
    .sort((a, b) => {
      // Best price first
      if (newOrder.side === 'buy') return a.price - b.price; // lowest sell first
      return b.price - a.price; // highest buy first
    });

  for (const maker of candidates) {
    if (remaining() <= 0) break;

    const makerRemaining = maker.amount - maker.filled;
    const matchVolume = Math.min(remaining(), makerRemaining);
    const matchPrice = maker.price; // execute at maker's price (limit order)

    // Apply fees
    const takerFee = matchVolume * TAKER_FEE;
    const makerFee = matchVolume * MAKER_FEE;

    // Create match
    const match: Match = {
      id: generateId(),
      price: matchPrice,
      volume: matchVolume,
      buyOrderId: newOrder.side === 'buy' ? newOrder.id : maker.id,
      sellOrderId: newOrder.side === 'sell' ? newOrder.id : maker.id,
      buyUserId: newOrder.side === 'buy' ? newOrder.userId : maker.userId,
      sellUserId: newOrder.side === 'sell' ? newOrder.userId : maker.userId,
      createdAt: Date.now(),
    };
    matches.push(match);

    // Update fills
    newOrder.filled += matchVolume;
    maker.filled += matchVolume;

    if (maker.filled >= maker.amount) maker.status = 'complete';
    else maker.status = 'partial';

    // Settle balances
    const usdAmount = matchVolume * matchPrice;

    if (newOrder.side === 'buy') {
      // Taker is buyer: gets BTC minus taker fee
      updateUserBalance(newOrder.userId, matchVolume - takerFee, 0);
      // Refund excess if match price is better than order price
      const refund = (newOrder.price - matchPrice) * matchVolume;
      if (refund > 0) updateUserBalance(newOrder.userId, 0, refund);
      // Maker is seller: gets USD minus maker fee, already reserved BTC
      updateUserBalance(maker.userId, 0, usdAmount * (1 - MAKER_FEE));
    } else {
      // Taker is seller: gets USD minus taker fee
      updateUserBalance(newOrder.userId, 0, usdAmount * (1 - TAKER_FEE));
      // Maker is buyer: gets BTC minus maker fee, already reserved USD
      updateUserBalance(maker.userId, matchVolume - makerFee, 0);
    }
  }

  if (newOrder.filled >= newOrder.amount) {
    newOrder.status = 'complete';
  } else if (newOrder.filled > 0) {
    newOrder.status = 'partial';
  }

  saveOrders(orders);
  saveMatches(matches);
}

export function cancelOrder(orderId: string, userId: string): boolean {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId && o.userId === userId);
  if (!order || order.status === 'complete' || order.status === 'cancelled') return false;

  const remaining = order.amount - order.filled;
  order.status = 'cancelled';

  // Refund reserved funds
  if (order.side === 'buy') {
    updateUserBalance(userId, 0, remaining * order.price);
  } else {
    updateUserBalance(userId, remaining, 0);
  }

  saveOrders(orders);
  notify();
  return true;
}

export function getOrderBook(): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  const orders = getOrders().filter(o => o.status === 'active' || o.status === 'partial');

  const bidsMap = new Map<number, number>();
  const asksMap = new Map<number, number>();

  for (const o of orders) {
    const remaining = o.amount - o.filled;
    if (remaining <= 0) continue;
    const map = o.side === 'buy' ? bidsMap : asksMap;
    map.set(o.price, (map.get(o.price) || 0) + remaining);
  }

  const bids: OrderBookLevel[] = Array.from(bidsMap.entries())
    .map(([price, volume]) => ({ price, volume }))
    .sort((a, b) => b.price - a.price);

  const asks: OrderBookLevel[] = Array.from(asksMap.entries())
    .map(([price, volume]) => ({ price, volume }))
    .sort((a, b) => a.price - b.price);

  return { bids, asks };
}

export function getStats(): Stats {
  const matches = getMatches();
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const recent = matches.filter(m => now - m.createdAt < h24);

  return {
    lastPrice: matches.length > 0 ? matches[matches.length - 1].price : null,
    btcVolume24h: recent.reduce((s, m) => s + m.volume, 0),
    usdVolume24h: recent.reduce((s, m) => s + m.volume * m.price, 0),
    high24h: recent.length > 0 ? Math.max(...recent.map(m => m.price)) : null,
    low24h: recent.length > 0 ? Math.min(...recent.map(m => m.price)) : null,
  };
}

export function getUserOrders(userId: string): Order[] {
  return getOrders().filter(o => o.userId === userId);
}

export function getUserMatches(userId: string): Match[] {
  return getMatches().filter(m => m.buyUserId === userId || m.sellUserId === userId);
}
