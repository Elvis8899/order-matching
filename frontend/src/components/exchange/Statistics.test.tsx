import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Statistics from "@/components/exchange/Statistics";
import { renderWithExchange } from "@/test/exchangeContext";

describe("Statistics", () => {
  const valueOf = (label: string) =>
    screen.getByText(label).nextElementSibling?.textContent;

  it("Should show a dash for prices without matches", () => {
    renderWithExchange(<Statistics />);

    expect(valueOf("Last Price")).toBe("—");
    expect(valueOf("24h High")).toBe("—");
    expect(valueOf("24h Low")).toBe("—");
    expect(valueOf("BTC Vol 24h")).toBe("0.0000 BTC");
  });

  it("Should show the statistics and the wallet", () => {
    renderWithExchange(<Statistics />, {
      stats: {
        lastPrice: 30000,
        btcVolume24h: 1.5,
        usdVolume24h: 45000,
        high24h: 31000,
        low24h: 29000.5,
      },
      wallet: { usd: 1234.5, btc: 0.1 },
    });

    expect(valueOf("Last Price")).toBe("$30,000.00");
    expect(valueOf("BTC Vol 24h")).toBe("1.5000 BTC");
    expect(valueOf("USD Vol 24h")).toBe("$45,000.00");
    expect(valueOf("24h High")).toBe("$31,000.00");
    expect(valueOf("24h Low")).toBe("$29,000.50");
    expect(valueOf("USD Balance")).toBe("$1,234.50");
    expect(valueOf("BTC Balance")).toBe("0.100000 BTC");
  });

  it("Should hide the wallet before it loads", () => {
    renderWithExchange(<Statistics />, { wallet: null });
    expect(screen.queryByText("USD Balance")).not.toBeInTheDocument();
  });
});
