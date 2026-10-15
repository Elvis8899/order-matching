import { Prisma } from "@prisma/client";
import {
  Decimal,
  DecimalType,
  positiveDecimal,
  sumOf,
} from "@shared/utils/domain/decimal";

describe("[Unit] DecimalType", () => {
  it.each([
    ["a decimal string", "100.25", "100.25"],
    ["a negative string", "-0.3", "-0.3"],
    ["a number", 0.1, "0.1"],
    ["a Decimal", new Decimal("1.5"), "1.5"],
    [
      "a Prisma Decimal",
      new Prisma.Decimal("99999.0000000001"),
      "99999.0000000001",
    ],
  ])("Should accept %s", (_label, input, expected) => {
    const parsed = DecimalType.parse(input);

    expect(parsed).toBeInstanceOf(Decimal);
    expect(parsed.toString()).toBe(expected);
  });

  it.each([
    ["an exponent", "1e5"],
    ["hexadecimal", "0x10"],
    ["text", "abc"],
    ["an empty string", ""],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["null", null],
    ["a NaN Decimal", new Decimal(Number.NaN)],
    ["an infinite Decimal", new Decimal(Number.POSITIVE_INFINITY)],
  ])("Should reject %s", (_label, input) => {
    expect(DecimalType.safeParse(input).success).toBe(false);
  });

  it("Should add without float errors", () => {
    const sum = DecimalType.parse("0.1").add(DecimalType.parse("0.2"));

    expect(sum.eq("0.3")).toBe(true);
  });

  it("Should multiply the largest stored values exactly", () => {
    // 30 digits each, with 8 and 10 places like the BTC and USD columns
    const amount = "9999999999999999999999.99999999";
    const price = "99999999999999999999.9999999999";
    const digits = (value: string) => BigInt(value.replace(".", ""));
    const exact = (digits(amount) * digits(price)).toString();

    const product = new Decimal(amount).mul(new Decimal(price));

    // The product has 8 + 10 = 18 places
    expect(product.toFixed(18).replace(".", "")).toBe(exact);
  });
});

describe("[Unit] positiveDecimal", () => {
  const twoPlaces = positiveDecimal(2);

  it("Should accept a positive value within the scale", () => {
    expect(twoPlaces.parse("0.01").toString()).toBe("0.01");
  });

  it.each([
    ["zero", "0"],
    ["a negative value", "-1"],
    ["too many places", "0.001"],
  ])("Should reject %s", (_label, input) => {
    expect(twoPlaces.safeParse(input).success).toBe(false);
  });
});

describe("[Unit] sumOf", () => {
  it("Should add the values, or give zero for none", () => {
    expect(sumOf([new Decimal("0.1"), new Decimal("0.2")]).toString()).toBe(
      "0.3",
    );
    expect(sumOf([]).toString()).toBe("0");
  });
});
