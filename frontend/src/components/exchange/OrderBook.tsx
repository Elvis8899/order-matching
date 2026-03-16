import { useExchange } from "@/lib/ExchangeContext";

const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const OrderBook = () => {
  const { orderBook, setFillFormBuy, setFillFormAsk } = useExchange();

  const handleBidClick = (price: number, amount: number) => {
    // Clicking a bid fills the sell form
    setFillFormAsk({ price, amount });
  };

  const handleAskClick = (price: number, amount: number) => {
    // Clicking an ask fills the buy form
    setFillFormBuy({ price, amount });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Bids */}
      <div className="rounded-md border border-border bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-buy mb-2">
          Bid (Buy Orders)
        </h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase">
              <th className="text-left pb-2 font-medium">Price</th>
              <th className="text-right pb-2 font-medium">Volume</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {orderBook.bids.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="text-center py-4 text-muted-foreground"
                >
                  No bids
                </td>
              </tr>
            )}
            {orderBook.bids.map((level, i) => (
              <tr
                key={i}
                className="border-t border-border/50 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleBidClick(level.price, level.amount)}
              >
                <td className="py-1 text-buy">${fmt(level.price)}</td>
                <td className="py-1 text-right text-muted-foreground">
                  {fmt(level.volume, 6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Asks */}
      <div className="rounded-md border border-border bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sell mb-2">
          Ask (Sell Orders)
        </h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase">
              <th className="text-left pb-2 font-medium">Price</th>
              <th className="text-right pb-2 font-medium">Volume</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {orderBook.asks.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="text-center py-4 text-muted-foreground"
                >
                  No asks
                </td>
              </tr>
            )}
            {orderBook.asks.map((level, i) => (
              <tr
                key={i}
                className="border-t border-border/50 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleAskClick(level.price, level.amount)}
              >
                <td className="py-1 text-sell">${fmt(level.price)}</td>
                <td className="py-1 text-right text-muted-foreground">
                  {fmt(level.volume, 6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderBook;
