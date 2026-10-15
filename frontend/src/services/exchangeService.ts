import {
  GroupedOrder,
  Match,
  Order,
  PaginatedResponse,
  PaginationOptions,
  Stats,
  Wallet,
} from "@/lib/types";
import { http } from "./api";

export class ExchangeService {
  static async getWalletById() {
    return http.get<Wallet>("wallet");
  }

  static async createOrder(
    order: Pick<Order, "userId" | "side" | "price" | "amount">,
  ) {
    return http.post<void>("orders", order);
  }

  static async getOrdersPaginated(
    userId?: string,
    options?: PaginationOptions,
  ) {
    const { page = 0, limit = 10 } = options || {};
    return http.get<PaginatedResponse<Order>>("orders", {
      params: { page, limit, userId },
    });
  }

  static async getMatchesPaginated(
    userId?: string,
    options?: PaginationOptions,
  ) {
    const { page = 0, limit = 10 } = options || {};
    return http.get<PaginatedResponse<Match>>("matches", {
      params: { page, limit, userId },
    });
  }

  static async getGroupedOrdersPaginated(
    side: "buy" | "sell",
    options?: PaginationOptions,
  ) {
    const { page = 0, limit = 10 } = options || {};
    return http.get<PaginatedResponse<GroupedOrder>>("orders/grouped", {
      params: { page, limit, side },
    });
  }

  static async cancelOrder(orderId: string) {
    return http.delete<void>(`orders/${orderId}`);
  }

  static async matchStatistics() {
    return http.get<Stats>("match/statistics");
  }
}
