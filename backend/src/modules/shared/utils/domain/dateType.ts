import { z } from "zod";

/**
 * A date given as an ISO string, a timestamp or a Date object.
 * `null` stands for "now", for rows that arrive without a date.
 */
export const DateType = z.preprocess(
  (value) => (value === null ? new Date() : value),
  z.union([z.date(), z.string(), z.number()]).pipe(z.coerce.date()),
);
export type DateType = z.infer<typeof DateType>;
