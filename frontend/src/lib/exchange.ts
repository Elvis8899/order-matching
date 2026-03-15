import { Order, OrderBookLevel } from "./types";

// listeners for real-time updates
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getOrderBook(orders: Order[]): {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
} {
  const filteredOrders = orders.filter(
    (o) => o.status === "active" || o.status === "partial",
  );

  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  const addToArray = (o: Order, arr: OrderBookLevel[]) => {
    const hasItem = arr.find((i) => i.price === o.price);
    const remaining = o.amount - o.filled;
    if (hasItem) {
      hasItem.amount += remaining;
      hasItem.volume += remaining * o.price;
      return;
    }
    arr.push({
      price: o.price,
      amount: remaining,
      volume: remaining * o.price,
    });
  };
  for (const o of filteredOrders) {
    const remaining = o.amount - o.filled;
    if (remaining <= 0) continue;
    const map = o.side === "buy" ? bids : asks;
    addToArray(o, map);
  }

  return { bids, asks };
}
