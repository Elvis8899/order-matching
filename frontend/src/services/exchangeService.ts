import { Match, Order, PaginatedResponse, Stats, User } from "@/lib/types";
import { http } from "./api";

export class ExchangeService {
  static async getWalletById() {
    return http.get<{ btc: number; usd: number }>("wallet");
  }

  static async createOrder(
    order: Pick<Order, "userId" | "side" | "price" | "amount">,
  ) {
    return http.post<void>("orders", order);
  }

  static async getOrdersPaginated(userId?: string) {
    return http.get<PaginatedResponse<Order>>("orders", {
      params: { page: 0, limit: 100, userId },
    });
  }

  static async getMatchesPaginated(userId?: string) {
    return http.get<PaginatedResponse<Match>>("matches", {
      params: { page: 0, limit: 100, userId },
    });
  }

  static async cancelOrder(orderId: string) {
    return http.delete<void>(`orders/${orderId}`);
  }

  static async matchStatistics() {
    return http.get<Stats>("match/statistics");
  }
}
