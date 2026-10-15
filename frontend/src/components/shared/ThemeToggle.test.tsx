import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ThemeToggle from "@/components/shared/ThemeToggle";

describe("ThemeToggle", () => {
  const isDark = () => document.documentElement.classList.contains("dark");

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("Should start dark", () => {
    render(<ThemeToggle />);
    expect(isDark()).toBe(true);
  });

  it("Should start with the stored theme", () => {
    localStorage.setItem("theme", "light");
    render(<ThemeToggle />);
    expect(isDark()).toBe(false);
  });

  it("Should switch and remember the theme", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(isDark()).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(isDark()).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
