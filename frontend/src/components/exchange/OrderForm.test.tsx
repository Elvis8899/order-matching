import { fireEvent, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import OrderForm from "@/components/exchange/OrderForm";
import { renderWithExchange } from "@/test/exchangeContext";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("OrderForm", () => {
  const amount = () => screen.getAllByRole("spinbutton")[0];
  const price = () => screen.getAllByRole("spinbutton")[1];
  const fill = (a: string, p: string) => {
    fireEvent.change(amount(), { target: { value: a } });
    fireEvent.change(price(), { target: { value: p } });
  };

  afterEach(() => vi.clearAllMocks());

  it("Should show the order total", () => {
    renderWithExchange(<OrderForm side="buy" />);

    fill("0.5", "30000");

    expect(screen.getByText("$15,000.00")).toBeInTheDocument();
  });

  it.each([
    ["buy", "Place Buy Order", "Buy order placed"],
    ["sell", "Place Sell Order", "Sell order placed"],
  ] as const)(
    "Should place a %s order and clear the form",
    async (side, button, message) => {
      const submitOrder = vi.fn().mockResolvedValue({ success: true });
      renderWithExchange(<OrderForm side={side} />, { submitOrder });

      fill("0.5", "30000");
      fireEvent.click(screen.getByRole("button", { name: button }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message));
      expect(submitOrder).toHaveBeenCalledWith(side, 30000, 0.5);
      expect(amount()).toHaveValue(null);
      expect(price()).toHaveValue(null);
    },
  );

  it.each([
    ["", "30000"],
    ["0.5", ""],
    ["0", "30000"],
    ["0.5", "0"],
  ])(
    "Should not send an order with amount %j and price %j",
    async (a, p) => {
      const { state } = renderWithExchange(<OrderForm side="buy" />);

      fill(a, p);
      fireEvent.click(screen.getByRole("button", { name: "Place Buy Order" }));

      expect(toast.error).toHaveBeenCalledWith("Enter valid amount and price");
      expect(state.submitOrder).not.toHaveBeenCalled();
    },
  );

  it("Should show the server's error and keep the values", async () => {
    const submitOrder = vi
      .fn()
      .mockResolvedValue({ success: false, error: "Insufficient funds" });
    renderWithExchange(<OrderForm side="buy" />, { submitOrder });

    fill("0.5", "30000");
    fireEvent.click(screen.getByRole("button", { name: "Place Buy Order" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Insufficient funds"),
    );
    expect(amount()).toHaveValue(0.5);
  });

  it("Should show a generic error when the server gives none", async () => {
    const submitOrder = vi.fn().mockResolvedValue({ success: false });
    renderWithExchange(<OrderForm side="sell" />, { submitOrder });

    fill("0.5", "30000");
    fireEvent.click(screen.getByRole("button", { name: "Place Sell Order" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Order failed"));
  });

  it.each([
    ["buy", "fillFormBuy", "setFillFormBuy"],
    ["sell", "fillFormAsk", "setFillFormAsk"],
  ] as const)(
    "Should fill the %s form from the order book, once",
    (side, fillKey, setKey) => {
      const { state } = renderWithExchange(<OrderForm side={side} />, {
        [fillKey]: { price: 30000, amount: 0.25 },
      });

      expect(amount()).toHaveValue(0.25);
      expect(price()).toHaveValue(30000);
      expect(state[setKey]).toHaveBeenCalledWith(null);
    },
  );
});
