import DecimalJs from "decimal.js";
import { z } from "zod";

/**
 * Exact decimal arithmetic for money. Stored values have up to 30 digits,
 * so 64 significant digits holds the product of any two without rounding.
 */
export const Decimal = DecimalJs.clone({
  precision: 64,
  rounding: DecimalJs.ROUND_HALF_UP,
});
export type Decimal = DecimalJs;

/** Decimal places kept for BTC amounts: one satoshi. */
export const BTC_SCALE = 8;
/** Decimal places kept for USD: exact for a cent price times a satoshi. */
export const USD_SCALE = 10;

const plainDecimal = /^-?\d+(\.\d+)?$/;

/**
 * A decimal given as a Decimal (including Prisma's), a plain decimal string
 * or a finite number. Exponents, hexadecimal and NaN are rejected.
 */
export const DecimalType = z
  .union([
    z.custom<DecimalJs>(
      (value) => DecimalJs.isDecimal(value) && value.isFinite(),
    ),
    z.string().regex(plainDecimal),
    // Zod rejects NaN and Infinity
    z.number(),
  ])
  .transform(
    (value) =>
      new Decimal(typeof value === "number" ? value : value.toString()),
  );
export type DecimalType = z.infer<typeof DecimalType>;
/** What DecimalType accepts: a Decimal, a decimal string or a number. */
export type DecimalInput = z.input<typeof DecimalType>;

/** Swagger options for a decimal sent as a string, such as "100.5". */
export const decimalApiProperty = (description: string, example: string) => ({
  description,
  type: String,
  example,
  required: true,
});

/** A positive decimal with at most `scale` decimal places. */
export const positiveDecimal = (scale: number) =>
  DecimalType.refine((value) => value.isPositive() && !value.isZero(), {
    message: "Expected a positive value",
  }).refine((value) => value.decimalPlaces() <= scale, {
    message: `Expected at most ${String(scale)} decimal places`,
  });

export const sumOf = (values: Decimal[]): Decimal =>
  values.reduce((sum, value) => sum.add(value), new Decimal(0));
