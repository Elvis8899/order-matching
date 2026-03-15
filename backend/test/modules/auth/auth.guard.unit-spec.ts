import { RequestJWTPayload } from "@auth/domain/login.entity";
import { AuthGuard } from "@auth/guards/auth.guard";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { UserRoleEnum } from "@user/domain/user.entity";
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
      user: { email: "admin@admin.com", role: UserRoleEnum.Admin },
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
    // it("should return true if the token is valid", async () => {
    //   // Arrange
    //   const mockPayload = { username: "testuser", roles: ["user"] };
    //   // Force the mock verify function to resolve with a valid payload
    //   jest.spyOn(jwtService, "verify").mockResolvedValue();

    //   // Mock the request headers
    //   mockContext.switchToHttp().getRequest.mockReturnValue({
    //     headers: { authorization: "Bearer validtoken" },
    //   });

    //   // Act
    //   const result = await guard.canActivate(mockContext);

    //   // Assert
    //   expect(result).toBe(true);
    //   // Ensure the verify method was called
    //   expect(jwtService.verify).toHaveBeenCalledWith("validtoken");
    //   // Ensure user payload was attached to the request
    //   expect(mockContext.switchToHttp().getRequest().user).toEqual(mockPayload);
    // });

    // it("should throw an UnauthorizedException if no token is found", async () => {
    //   // Arrange
    //   mockContext.switchToHttp().getRequest.mockReturnValue({
    //     headers: {}, // No authorization header
    //   });

    //   // Act & Assert
    //   await expect(guard.canActivate(mockContext)).rejects.toThrow(
    //     UnauthorizedException,
    //   );
    //   await expect(guard.canActivate(mockContext)).rejects.toThrow(
    //     "No authorization header found",
    //   );
    // });

    // it("should throw an UnauthorizedException if the token is invalid", async () => {
    //   // Arrange
    //   // Force the mock verify function to throw an error (simulating invalid token)
    //   jest
    //     .spyOn(jwtService, "verify")
    //     .mockRejectedValue(new Error("Invalid token") as never);

    //   mockContext.switchToHttp().getRequest.mockReturnValue({
    //     headers: { authorization: "Bearer invalidtoken" },
    //   });

    //   // Act & Assert
    //   await expect(guard.canActivate(mockContext)).rejects.toThrow(
    //     UnauthorizedException,
    //   );
    //   await expect(guard.canActivate(mockContext)).rejects.toThrow(
    //     "Invalid or expired token",
    //   );
    // });
  });
});
// describe("RolesGuard", () => {
//   let guard: AuthGuard;
//   const fakeRequest = {
//     headers: {
//       authorization: "Bearer token",
//     },
//   };
//   beforeEach(() => {
//     guard = new AuthGuard();
//   });

//   it("should be defined", () => {
//     expect(guard).toBeDefined();
//   });

//   it("should allow access when no roles are required", () => {
//     const mockContext = createMockExecutionContext({});

//     const result = guard.canActivate(mockContext);

//     expect(result).toBe(true);
//   });

//   // it("should allow access when user has required role", () => {
//   //   const mockContext = createMockExecutionContext({
//   //     user: { role: UserRoleEnum.Admin },
//   //   });
//   //     .mockReturnValue([UserRoleEnum.Admin]);

//   //   const result = guard.canActivate(mockContext);

//   //   expect(result).toBe(true);
//   // });

//   // it("should deny access when user does not have required role", () => {
//   //   const mockContext = createMockExecutionContext({
//   //     user: { role: UserRoleEnum.Client },
//   //   });
//   //   jest
//   //     .spyOn(reflector, "getAllAndOverride")
//   //     .mockReturnValue([UserRoleEnum.Admin]);

//   //   const result = guard.canActivate(mockContext);

//   //   expect(result).toBe(false);
//   // });

//   // it("should deny access when user roles is undefined", () => {
//   //   const mockContext = createMockExecutionContext({
//   //     user: {},
//   //   });
//   //   jest
//   //     .spyOn(reflector, "getAllAndOverride")
//   //     .mockReturnValue([UserRoleEnum.Admin]);

//   //   const result = guard.canActivate(mockContext);

//   //   expect(result).toBe(false);
//   // });

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
