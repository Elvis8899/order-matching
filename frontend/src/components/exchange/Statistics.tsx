import { useExchange } from '@/lib/ExchangeContext';

const fmt = (n: number, decimals = 2) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const Statistics = () => {
  const { stats, user } = useExchange();

  const items = [
    { label: 'Last Price', value: stats.lastPrice !== null ? `$${fmt(stats.lastPrice)}` : '—' },
    { label: 'BTC Vol 24h', value: `${fmt(stats.btcVolume24h, 4)} BTC` },
    { label: 'USD Vol 24h', value: `$${fmt(stats.usdVolume24h)}` },
    { label: '24h High', value: stats.high24h !== null ? `$${fmt(stats.high24h)}` : '—' },
    { label: '24h Low', value: stats.low24h !== null ? `$${fmt(stats.low24h)}` : '—' },
  ];

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statistics</h2>
      <div className="grid grid-cols-5 gap-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="text-[10px] uppercase text-muted-foreground">{item.label}</div>
            <div className="font-mono text-sm text-foreground font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
      {user && (
        <div className="flex gap-6 pt-2 border-t border-border">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">USD Balance</span>
            <div className="font-mono text-sm text-buy font-semibold">${fmt(user.usdBalance)}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">BTC Balance</span>
            <div className="font-mono text-sm text-buy font-semibold">{fmt(user.btcBalance, 6)} BTC</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
