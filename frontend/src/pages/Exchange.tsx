import { useExchange } from "@/lib/ExchangeContext";
import Statistics from "@/components/exchange/Statistics";
import GlobalMatches from "@/components/exchange/GlobalMatches";
import OrderForm from "@/components/exchange/OrderForm";
import MyActiveOrders from "@/components/exchange/MyActiveOrders";
import MyHistory from "@/components/exchange/MyHistory";
import OrderBook from "@/components/exchange/OrderBook";
import { LogOut, Bitcoin } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

const Exchange = () => {
  const { user, logout } = useExchange();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bitcoin className="h-6 w-6 text-buy" />
          <span className="text-lg font-bold text-foreground tracking-tight">
            EXCHANGE
          </span>
          <span className="text-xs text-muted-foreground ml-2 font-mono">
            USD / BTC
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-mono">
            {user?.username}
          </span>
          <ThemeToggle />
          <button
            onClick={logout}
            aria-label="Log out"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-[1400px] mx-auto">
        {/* Statistics */}
        <Statistics />

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Order Book (Bid/Ask) */}
          <div className="col-span-4">
            <OrderBook />
          </div>

          {/* Buy/Sell Forms */}
          <div className="col-span-4 grid grid-cols-2 gap-4">
            <OrderForm side="buy" />
            <OrderForm side="sell" />
          </div>

          {/* Global Matches */}
          <div className="col-span-4">
            <GlobalMatches />
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          <MyActiveOrders />
          <MyHistory />
        </div>
      </div>
    </div>
  );
};

export default Exchange;
