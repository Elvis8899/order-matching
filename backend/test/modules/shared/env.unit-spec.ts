import { getBaseEnvPath } from "@shared/utils/config/dotenv";

describe("[Unit] Environment", () => {
  it("Should return base env path for test", () => {
    //
    const res = getBaseEnvPath("test");

    expect(res).toBe(".env.test");
  });
  it("Should return default base env path", () => {
    //
    const res = getBaseEnvPath(undefined);

    expect(res).toBe(".env");
  });
});
