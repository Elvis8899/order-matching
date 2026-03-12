import { useState, useEffect } from 'react';
import { useExchange } from '@/lib/ExchangeContext';
import { toast } from 'sonner';
import type { OrderSide } from '@/lib/types';

const OrderForm = ({ side }: { side: OrderSide }) => {
  const { submitOrder, fillForm, setFillForm } = useExchange();
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (fillForm) {
      setPrice(fillForm.price.toString());
      setAmount(fillForm.amount.toString());
      setFillForm(null);
    }
  }, [fillForm, setFillForm]);

  const total = (parseFloat(amount) || 0) * (parseFloat(price) || 0);
  const isBuy = side === 'buy';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    const p = parseFloat(price);
    if (!a || a <= 0 || !p || p <= 0) {
      toast.error('Enter valid amount and price');
      return;
    }
    const result = submitOrder(side, p, a);
    if (result.success) {
      toast.success(`${isBuy ? 'Buy' : 'Sell'} order placed`);
      setAmount('');
      setPrice('');
    } else {
      toast.error(result.error || 'Order failed');
    }
  };

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isBuy ? 'text-buy' : 'text-sell'}`}>
        {isBuy ? 'Buy BTC' : 'Sell BTC'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Amount (BTC)</label>
          <input
            type="number"
            step="any"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">Price (USD)</label>
          <input
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Total: <span className="font-mono text-foreground">${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <button
          type="submit"
          className={`w-full rounded py-2 text-sm font-semibold transition-colors ${isBuy ? 'bg-buy text-buy-foreground hover:opacity-90' : 'bg-sell text-sell-foreground hover:opacity-90'}`}
        >
          {isBuy ? 'Place Buy Order' : 'Place Sell Order'}
        </button>
      </form>
    </div>
  );
};

export default OrderForm;
