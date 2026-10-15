import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { User } from "@/lib/types";
import { alice, exchangeState } from "@/test/exchangeContext";

// The provider is tested on its own; here it only decides who is logged in
let user: User | null = null;
vi.mock("@/lib/ExchangeProvider", async () => {
  const { ExchangeContext } = await import("@/lib/ExchangeContext");
  return {
    ExchangeProvider: ({ children }: { children: React.ReactNode }) => (
      <ExchangeContext.Provider value={exchangeState({ user })}>
        {children}
      </ExchangeContext.Provider>
    ),
  };
});

describe("App", () => {
  const open = (path: string) => {
    window.history.pushState({}, "", path);
    return render(<App />);
  };

  afterEach(() => {
    user = null;
    vi.restoreAllMocks();
  });

  it("Should show the login page when logged out", () => {
    open("/");
    expect(
      screen.getByRole("button", { name: "Login / Register" }),
    ).toBeInTheDocument();
  });

  it("Should show the exchange when logged in", () => {
    user = alice;
    open("/");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("Should show a 404 for an unknown page", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    open("/unknown");

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("404"),
      "/unknown",
    );
  });
});
