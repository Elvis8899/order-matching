import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Login from "@/pages/Login";
import { renderWithExchange } from "@/test/exchangeContext";

describe("Login", () => {
  const fill = (username: string, password: string) => {
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: username },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: password },
    });
  };
  const submit = () => screen.getByRole("button", { name: "Login / Register" });

  it("Should keep the button disabled until both fields are filled", () => {
    renderWithExchange(<Login />, { user: null });

    expect(submit()).toBeDisabled();
    fill("   ", "password123");
    expect(submit()).toBeDisabled();
    fill("alice", "");
    expect(submit()).toBeDisabled();
    fill("alice", "password123");
    expect(submit()).toBeEnabled();
  });

  it("Should not log in when Enter is pressed on an incomplete form", () => {
    const login = vi.fn();
    renderWithExchange(<Login />, { user: null, login });

    fill("alice", "");
    fireEvent.submit(submit());

    expect(login).not.toHaveBeenCalled();
  });

  it("Should log in with the trimmed username", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    renderWithExchange(<Login />, { user: null, login });

    fill(" alice ", "password123");
    fireEvent.click(submit());

    expect(login).toHaveBeenCalledWith("alice", "password123");
    // Stays disabled while the login is pending, so it is sent once
    await waitFor(() => expect(submit()).toBeDisabled());
  });

  it("Should show why the login failed and allow another try", async () => {
    const login = vi
      .fn()
      .mockRejectedValue(new Error("Wrong username or password"));
    renderWithExchange(<Login />, { user: null, login });

    fill("alice", "password123");
    fireEvent.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wrong username or password",
    );
    expect(submit()).toBeEnabled();
  });

  it("Should show a generic message for an unexpected failure", async () => {
    const login = vi.fn().mockRejectedValue("network down");
    renderWithExchange(<Login />, { user: null, login });

    fill("alice", "password123");
    fireEvent.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to login",
    );
  });
});
