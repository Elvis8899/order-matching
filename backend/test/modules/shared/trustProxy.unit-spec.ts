import { parseTrustProxy } from "@shared/utils/config/environment.config";

describe("[Unit] parseTrustProxy", () => {
  it.each([
    ["unset", undefined, false],
    ["empty", "  ", false],
    ["false", "false", false],
    ["true", "true", true],
    ["single CIDR", "172.18.0.0/16", ["172.18.0.0/16"]],
    ["list", "10.0.0.1, 172.18.0.0/16,", ["10.0.0.1", "172.18.0.0/16"]],
  ])("Should parse %s", (_: string, value: string | undefined, expected) => {
    expect(parseTrustProxy(value)).toEqual(expected);
  });
});
