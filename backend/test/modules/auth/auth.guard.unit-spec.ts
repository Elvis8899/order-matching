import { RequestJWTPayload } from "@auth/domain/login.entity";
import { AuthGuard } from "@auth/guards/auth.guard";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UnitModule } from "@test/util/defaultModule.unit";
import { unsafeCoerce } from "fp-ts/lib/function";

describe("AuthGuard", () => {
  const moduleRef = new UnitModule(
    {
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: {
            // Mock the 'verify' method (or 'sign', 'decode', etc.)
            verifyAsync: jest.fn(() => true),
          },
        },
      ],
    },
    (app) => ({
      guard: app.get(AuthGuard),
      jwtSpy: jest.spyOn(app.get(JwtService), "verifyAsync"),
    }),
  );
  beforeEach(async () => {
    await moduleRef.init();
  });

  it("should be defined", () => {
    expect(moduleRef.r.guard).toBeDefined();
  });

  describe("canActivate", () => {
    // Mock the ExecutionContext (request object is key)
    const defaultInput = {
      user: { username: "admin" },
      headers: { authorization: "Bearer token" },
    };
    it("should return true if the token is valid", async () => {
      const result = await moduleRef.r.guard.canActivate(
        createMockExecutionContext(defaultInput),
      );
      expect(result).toBe(true);
    });

    it("should return error if there is no token", async () => {
      const resultPromise = moduleRef.r.guard.canActivate(
        createMockExecutionContext({
          headers: {},
        }),
      );
      await expect(resultPromise).rejects.toThrow(UnauthorizedException);
    });

    it("should return error if the token is invalid", async () => {
      moduleRef.r.jwtSpy.mockRejectedValueOnce(new Error());
      const resultPromise = moduleRef.r.guard.canActivate(
        createMockExecutionContext(defaultInput),
      );
      await expect(resultPromise).rejects.toThrow(UnauthorizedException);
    });
  });
});

function createMockExecutionContext(request: {
  user?: Partial<RequestJWTPayload>;
  headers?: Record<string, string>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: unsafeCoerce(() => request),
      getResponse: unsafeCoerce(() => ({})),
      getNext: unsafeCoerce(() => jest.fn()),
    }),
    getHandler: unsafeCoerce(() => jest.fn()),
    getClass: unsafeCoerce(() => jest.fn()),
    getArgs: unsafeCoerce(() => []),
    getArgByIndex: unsafeCoerce(() => ({})),
    switchToRpc: () => ({
      getContext: unsafeCoerce(() => ({})),
      getData: unsafeCoerce(() => ({})),
    }),
    switchToWs: () => ({
      getClient: unsafeCoerce(() => ({})),
      getData: unsafeCoerce(() => ({})),
      getPattern: () => "test-pattern",
    }),
    getType: unsafeCoerce(() => "http"),
  };
}
