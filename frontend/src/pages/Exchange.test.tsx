import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Exchange from "@/pages/Exchange";
import { renderWithExchange } from "@/test/exchangeContext";

describe("Exchange", () => {
  it("Should show the user and every panel", () => {
    renderWithExchange(<Exchange />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    for (const title of [
      "Statistics",
      "Bid (Buy Orders)",
      "Ask (Sell Orders)",
      "Buy BTC",
      "Sell BTC",
      "Global Matches",
      "My Active Orders",
      "My History",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  it("Should log out", () => {
    const { state } = renderWithExchange(<Exchange />);

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(state.logout).toHaveBeenCalledTimes(1);
  });
});
