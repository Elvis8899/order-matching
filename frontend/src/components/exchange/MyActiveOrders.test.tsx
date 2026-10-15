import { fireEvent, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import MyActiveOrders from "@/components/exchange/MyActiveOrders";
import { Order } from "@/lib/types";
import { alice, paginated, renderWithExchange } from "@/test/exchangeContext";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "order-1",
  userId: alice.id,
  side: "buy",
  price: 30000,
  amount: 2,
  filled: 0.5,
  status: "partial",
  createdAt: 0,
  ...overrides,
});

describe("MyActiveOrders", () => {
  afterEach(() => vi.clearAllMocks());

  it("Should say when there are no active orders", () => {
    renderWithExchange(<MyActiveOrders />);
    expect(screen.getByText("No active orders")).toBeInTheDocument();
  });

  it("Should show the remaining amount, price, side and filled share", () => {
    renderWithExchange(<MyActiveOrders />, {
      myOrders: paginated([order(), order({ id: "order-2", side: "sell" })]),
    });

    const [, buyRow, sellRow] = screen.getAllByRole("row");
    expect(buyRow).toHaveTextContent("1.500000 BTC$30,000.00Buy25%");
    expect(sellRow).toHaveTextContent("Sell");
  });

  it("Should cancel an order", async () => {
    const cancelUserOrder = vi.fn().mockResolvedValue(true);
    renderWithExchange(<MyActiveOrders />, {
      myOrders: paginated([order()]),
      cancelUserOrder,
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));

    expect(cancelUserOrder).toHaveBeenCalledWith("order-1");
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Order cancelled"),
    );
  });

  it("Should say when the order could not be cancelled", async () => {
    const cancelUserOrder = vi.fn().mockResolvedValue(false);
    renderWithExchange(<MyActiveOrders />, {
      myOrders: paginated([order()]),
      cancelUserOrder,
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Unable to cancel the order"),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
