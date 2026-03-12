import { useExchange } from '@/lib/ExchangeContext';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const MyActiveOrders = () => {
  const { myOrders, cancelUserOrder } = useExchange();
  const active = myOrders.filter(o => o.status === 'active' || o.status === 'partial');

  const handleCancel = (id: string) => {
    if (cancelUserOrder(id)) toast.success('Order cancelled');
  };

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">My Active Orders</h2>
      <div className="overflow-auto max-h-48">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase">
              <th className="text-left pb-2 font-medium">Amount</th>
              <th className="text-left pb-2 font-medium">Price</th>
              <th className="text-left pb-2 font-medium">Type</th>
              <th className="text-right pb-2 font-medium">Filled</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {active.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">No active orders</td></tr>
            )}
            {active.map(o => (
              <tr key={o.id} className="border-t border-border/50">
                <td className="py-1">{fmt(o.amount - o.filled, 6)} BTC</td>
                <td className="py-1">${fmt(o.price)}</td>
                <td className={`py-1 ${o.side === 'buy' ? 'text-buy' : 'text-sell'}`}>
                  {o.side === 'buy' ? 'Buy' : 'Sell'}
                </td>
                <td className="py-1 text-right text-muted-foreground">{((o.filled / o.amount) * 100).toFixed(0)}%</td>
                <td className="py-1 text-right">
                  <button onClick={() => handleCancel(o.id)} className="text-sell hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyActiveOrders;
