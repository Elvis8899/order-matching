import { formatAmount } from "@/lib/utils";
import Pagination from "@/components/shared/Pagination";
import { useExchange } from "@/lib/ExchangeContext";


const GlobalMatches = () => {
  const { globalMatches } = useExchange();
  const { data, pages } = globalMatches;
  const items = data.data;

  return (
    <div className="rounded-md border border-border bg-card p-4 h-full flex flex-col">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Global Matches
      </h2>
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase">
              <th className="text-left pb-2 font-medium">Price</th>
              <th className="text-right pb-2 font-medium">Volume</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="text-center py-8 text-muted-foreground"
                >
                  No matches yet
                </td>
              </tr>
            )}
            {items.map((m) => (
              <tr key={m.id} className="border-t border-border/50">
                <td className="py-1 text-foreground">${formatAmount(m.price)}</td>
                <td className="py-1 text-right text-muted-foreground">
                  {formatAmount(m.volume, 6)} BTC
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination state={globalMatches} />
    </div>
  );
};

export default GlobalMatches;
