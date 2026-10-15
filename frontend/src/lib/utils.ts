import {
  PaginatedResponse,
  PaginationHook,
  PaginationOptions,
} from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import { useCallback, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats an amount the API sent as a decimal string, for display only. */
export function formatAmount(value: string | number, decimals = 2) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function defaultPaginatedResponse<U>(): PaginatedResponse<U> {
  return {
    count: 0,
    limit: 10,
    page: 0,
    data: [],
  };
}

export function usePaginatedHook<U>(
  fn: (x: PaginationOptions) => Promise<PaginatedResponse<U>>,
): PaginationHook<U> {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<PaginatedResponse<U>>(
    defaultPaginatedResponse(),
  );
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [limit, setLimit] = useState(10);
  // const refresh = () => {}; //setTick(tick + 1);
  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);
  const reset = useCallback(() => {
    setPage(0);
    setLimit(10);
  }, []);
  useEffect(() => {
    // no-op if the socket is already connected
    fn({ page, limit }).then((res) => {
      setData(res);
      setPages(Math.ceil(res.count / limit));
    });
  }, [tick, page, limit, fn]);
  return { data, pages, setPage, setLimit, refresh, reset };
}
