import { RequestJWTPayload } from "@auth/domain/login.entity";
import { AuthGuard } from "@auth/guards/auth.guard";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { unsafeCoerce } from "fp-ts/lib/function";

describe("AuthGuard", () => {
  let guard: AuthGuard;
  let fnToUse = () => true;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          // Provide a mock for the JwtService
          provide: JwtService,
          useValue: {
            // Mock the 'verify' method (or 'sign', 'decode', etc.)
            verifyAsync: jest.fn(() => fnToUse()),
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("canActivate", () => {
    // Mock the ExecutionContext (request object is key)
    const defaultInput = {
      user: { username: "admin" },
      headers: { authorization: "Bearer token" },
    };
    it("should return true if the token is valid", async () => {
      fnToUse = () => true;
      const result = await guard.canActivate(
        createMockExecutionContext(defaultInput),
      );
      expect(result).toBe(true);
    });

    it("should return error if there is no token", async () => {
      fnToUse = () => true;
      const resultPromise = guard.canActivate(
        createMockExecutionContext({
          headers: {},
        }),
      );
      await expect(resultPromise).rejects.toThrow(UnauthorizedException);
    });

    it("should return error if the token is invalid", async () => {
      fnToUse = () => {
        throw new Error();
      };
      const resultPromise = guard.canActivate(
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
