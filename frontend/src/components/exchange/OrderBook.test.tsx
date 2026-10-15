import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OrderBook from "@/components/exchange/OrderBook";
import { paginated, renderWithExchange } from "@/test/exchangeContext";

describe("OrderBook", () => {
  const level = { price: 30000, amount: 0.75, volume: 22500 };

  it("Should say when there are no bids or asks", () => {
    renderWithExchange(<OrderBook />);
    expect(screen.getByText("No bids")).toBeInTheDocument();
    expect(screen.getByText("No asks")).toBeInTheDocument();
  });

  it("Should fill the sell form when a bid is clicked", () => {
    const { state } = renderWithExchange(<OrderBook />, {
      groupedAskOrders: paginated([level]),
    });

    fireEvent.click(screen.getByText("$30,000.00"));

    expect(state.setFillFormAsk).toHaveBeenCalledWith({
      price: 30000,
      amount: 0.75,
    });
    expect(state.setFillFormBuy).not.toHaveBeenCalled();
  });

  it("Should fill the buy form when an ask is clicked", () => {
    const { state } = renderWithExchange(<OrderBook />, {
      groupedSellOrders: paginated([level]),
    });

    fireEvent.click(screen.getByText("$30,000.00"));

    expect(state.setFillFormBuy).toHaveBeenCalledWith({
      price: 30000,
      amount: 0.75,
    });
    expect(state.setFillFormAsk).not.toHaveBeenCalled();
  });
});
