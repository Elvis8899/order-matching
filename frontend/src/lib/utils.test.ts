import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaginationOptions } from "@/lib/types";
import { cn, usePaginatedHook } from "@/lib/utils";

describe("cn", () => {
  it("Should merge conflicting Tailwind classes", () => {
    expect(cn("p-2", null, "p-4")).toBe("p-4");
  });
});

describe("usePaginatedHook", () => {
  const page = ({ page = 0, limit = 10 }: PaginationOptions) =>
    Promise.resolve({ data: [page], count: 25, limit, page });

  const setup = () => {
    const fetchPage = vi.fn(page);
    const { result } = renderHook(() => usePaginatedHook(fetchPage));
    return { fetchPage, result };
  };

  it("Should start empty, then load the first page", async () => {
    const { fetchPage, result } = setup();

    expect(result.current.data.data).toEqual([]);
    await waitFor(() => expect(result.current.data.data).toEqual([0]));
    expect(result.current.pages).toBe(3);
    expect(fetchPage).toHaveBeenCalledWith({ page: 0, limit: 10 });
  });

  it("Should load another page and page size", async () => {
    const { fetchPage, result } = setup();

    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.data.page).toBe(2));

    act(() => result.current.setLimit(5));
    await waitFor(() => expect(result.current.pages).toBe(5));
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 2, limit: 5 });
  });

  it("Should reload the same page on refresh", async () => {
    const { fetchPage, result } = setup();
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

    act(() => result.current.refresh());

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, limit: 10 });
  });

  it("Should go back to the first page on reset", async () => {
    const { fetchPage, result } = setup();
    act(() => {
      result.current.setPage(2);
      result.current.setLimit(5);
    });
    await waitFor(() => expect(result.current.data.page).toBe(2));

    act(() => result.current.reset());

    await waitFor(() => expect(result.current.data.page).toBe(0));
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, limit: 10 });
  });
});
