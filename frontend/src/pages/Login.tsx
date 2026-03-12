import { useState } from "react";
import { useExchange } from "@/lib/ExchangeContext";
import { Bitcoin } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useExchange();
  const canSubmit = username.trim() !== "" && password !== "" && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login");
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-8 p-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Bitcoin className="h-10 w-10 text-buy" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              EXCHANGE
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            USD / BTC Exchange Simulator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-sell">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
          >
            Login / Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
