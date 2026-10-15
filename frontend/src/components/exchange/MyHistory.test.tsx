import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MyHistory from "@/components/exchange/MyHistory";
import { Match } from "@/lib/types";
import { alice, paginated, renderWithExchange } from "@/test/exchangeContext";

const match = (overrides: Partial<Match> = {}): Match => ({
  id: "match-1",
  price: "30000",
  volume: "0.5",
  buyOrderId: "buy-order",
  sellOrderId: "sell-order",
  buyUserId: alice.id,
  sellUserId: "bob-id",
  createdAt: 0,
  ...overrides,
});

describe("MyHistory", () => {
  it("Should say when there is no history", () => {
    renderWithExchange(<MyHistory />);
    expect(screen.getByText("No history")).toBeInTheDocument();
  });

  it("Should show the user's side of each match", () => {
    renderWithExchange(<MyHistory />, {
      myMatches: paginated([
        match(),
        match({ id: "match-2", buyUserId: "bob-id", sellUserId: alice.id }),
      ]),
    });

    const [, bought, sold] = screen.getAllByRole("row");
    expect(bought).toHaveTextContent("$30,000.000.500000 BTCBuy");
    expect(sold).toHaveTextContent("Sell");
  });
});
