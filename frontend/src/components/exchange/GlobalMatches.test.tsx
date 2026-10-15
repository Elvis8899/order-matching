import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GlobalMatches from "@/components/exchange/GlobalMatches";
import { Match } from "@/lib/types";
import { paginated, renderWithExchange } from "@/test/exchangeContext";

describe("GlobalMatches", () => {
  it("Should say when there are no matches", () => {
    renderWithExchange(<GlobalMatches />);
    expect(screen.getByText("No matches yet")).toBeInTheDocument();
  });

  it("Should show each match's price and volume", () => {
    renderWithExchange(<GlobalMatches />, {
      globalMatches: paginated([
        { id: "match-1", price: 30000, volume: 0.123456 } as Match,
      ]),
    });

    expect(screen.getAllByRole("row")[1]).toHaveTextContent(
      "$30,000.000.123456 BTC",
    );
  });
});
