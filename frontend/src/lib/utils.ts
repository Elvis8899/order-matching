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
