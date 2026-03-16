import { useExchange } from "@/lib/ExchangeContext";
import Pagination from "@/components/shared/Pagination";

const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const MyHistory = () => {
  const { myMatches, user } = useExchange();

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        My History
      </h2>
      <div className="overflow-auto max-h-48">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase">
              <th className="text-left pb-2 font-medium">Price</th>
              <th className="text-left pb-2 font-medium">Volume</th>
              <th className="text-left pb-2 font-medium">Type</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {myMatches.data.data.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center py-4 text-muted-foreground"
                >
                  No history
                </td>
              </tr>
            )}
            {myMatches.data.data.map((m) => {
              const isBuy = m.buyUserId === user?.id;
              return (
                <tr key={m.id} className="border-t border-border/50">
                  <td className="py-1">${fmt(m.price)}</td>
                  <td className="py-1">{fmt(m.volume, 6)} BTC</td>
                  <td className={`py-1 ${isBuy ? "text-buy" : "text-sell"}`}>
                    {isBuy ? "Buy" : "Sell"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination state={myMatches} />
    </div>
  );
};

export default MyHistory;
