import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { vi } from "vitest";
import { ExchangeContext } from "@/lib/ExchangeContext";
import { PaginationHook, User } from "@/lib/types";

type ExchangeState = React.ContextType<typeof ExchangeContext>;

export const alice: User = { id: "alice-id", username: "alice", role: "client" };

export function paginated<U>(
  data: U[] = [],
  { page = 0, pages = 1 } = {},
): PaginationHook<U> {
  return {
    data: { data, count: data.length, limit: 10, page },
    pages,
    setLimit: vi.fn(),
    setPage: vi.fn(),
    refresh: vi.fn(),
    reset: vi.fn(),
  };
}

// The context a logged-in user sees with empty tables; override what a test needs
export function exchangeState(
  overrides: Partial<ExchangeState> = {},
): ExchangeState {
  return {
    user: alice,
    wallet: { btc: "0", usd: "0" },
    login: vi.fn(),
    logout: vi.fn(),
    stats: {
      lastPrice: null,
      btcVolume24h: "0",
      usdVolume24h: "0",
      high24h: null,
      low24h: null,
    },
    groupedAskOrders: paginated(),
    groupedSellOrders: paginated(),
    globalMatches: paginated(),
    myOrders: paginated(),
    myMatches: paginated(),
    submitOrder: vi.fn(),
    cancelUserOrder: vi.fn(),
    refresh: vi.fn(),
    fillFormAsk: null,
    setFillFormAsk: vi.fn(),
    fillFormBuy: null,
    setFillFormBuy: vi.fn(),
    ...overrides,
  };
}

export function renderWithExchange(
  ui: ReactElement,
  overrides: Partial<ExchangeState> = {},
) {
  const state = exchangeState(overrides);
  return {
    state,
    ...render(
      <ExchangeContext.Provider value={state}>{ui}</ExchangeContext.Provider>,
    ),
  };
}
