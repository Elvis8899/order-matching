import { DateType } from "@shared/utils/domain/dateType";

describe("[Unit] DateType", () => {
  it.each([
    [
      "an ISO string",
      "2026-03-01T12:00:00.000Z",
      new Date("2026-03-01T12:00:00.000Z"),
    ],
    ["a timestamp", 1767225600000, new Date(1767225600000)],
    ["a Date", new Date(2026, 0, 15), new Date(2026, 0, 15)],
  ])("Should accept %s", (_label, input, expected) => {
    expect(DateType.parse(input)).toEqual(expected);
  });

  it("Should turn null into the current date", () => {
    const before = Date.now();

    const parsed = DateType.parse(null);

    expect(parsed.getTime()).toBeGreaterThanOrEqual(before);
    expect(parsed.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("Should reject a string that isn't a date", () => {
    expect(DateType.safeParse("not a date").success).toBe(false);
  });

  it.each([
    ["an object", {}],
    ["an array", []],
    ["a boolean", true],
  ])("Should reject %s", (_label, input) => {
    expect(DateType.safeParse(input).success).toBe(false);
  });
});
