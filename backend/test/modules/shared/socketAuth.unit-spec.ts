import { JwtService } from "@nestjs/jwt";
import { RequestJWTPayload } from "@src/modules/auth/domain/login.entity";
import { WsAuthService } from "@src/modules/shared/socket/adapter/socketAuth.service";
import { MockAuthGuardBuilder } from "@test/data-builders/mockAuthGuardBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";
import { unsafeCoerce } from "fp-ts/lib/function";
import { Socket } from "socket.io";

describe("WsAuthService", () => {
  const authPayload = new MockAuthGuardBuilder().buildPayload();
  const socketMock: Socket = unsafeCoerce({
    id: createTestId(TableNameEnum.None),
    handshake: {
      auth: {
        token: "token",
      },
    },
    data: {},
    join: jest.fn(),
  });
  const moduleRef = new UnitModule(
    {
      providers: [
        WsAuthService,
        {
          provide: JwtService,
          useValue: {
            // Mock the 'verify' method (or 'sign', 'decode', etc.)
            verifyAsync: jest.fn(() => authPayload),
          },
        },
      ],
    },
    (app) => ({
      wsAuthService: app.get(WsAuthService),
      jwtSpy: jest.spyOn(app.get(JwtService), "verifyAsync"),
    }),
  );
  beforeEach(async () => {
    await moduleRef.init();
  });

  it("should be defined", () => {
    expect(moduleRef.r.wsAuthService).toBeDefined();
  });

  it("Should add user data to socket", async () => {
    // When token is valid
    // On client connect
    moduleRef.r.wsAuthService.onClientConnect(socketMock);
    await moduleRef.r.wsAuthService.finishInitialization(socketMock);
    // Then user should match payload
    expect(socketMock.data as { user: RequestJWTPayload | null }).toMatchObject(
      { user: authPayload },
    );
  });

  it("Should add user data null to socket on error", async () => {
    // When token is invalid
    moduleRef.r.jwtSpy.mockRejectedValueOnce(new Error());
    // On client connect
    moduleRef.r.wsAuthService.onClientConnect(socketMock);
    await moduleRef.r.wsAuthService.finishInitialization(socketMock);
    // Then user data should be null
    expect(socketMock.data as { user: RequestJWTPayload | null }).toMatchObject(
      { user: null },
    );
  });
  // describe("canActivate", () => {
  //   // Mock the ExecutionContext (request object is key)
  //   const defaultInput = {
  //     user: { username: "admin" },
  //     headers: { authorization: "Bearer token" },
  //   };
  //   it("should return true if the token is valid", async () => {
  //     const result = await moduleRef.r.guard.canActivate(
  //       createMockExecutionContext(defaultInput),
  //     );
  //     expect(result).toBe(true);
  //   });

  //   it("should return error if there is no token", async () => {
  //     const resultPromise = moduleRef.r.guard.canActivate(
  //       createMockExecutionContext({
  //         headers: {},
  //       }),
  //     );
  //     await expect(resultPromise).rejects.toThrow(UnauthorizedException);
  //   });

  //   it("should return error if the token is invalid", async () => {
  //     fnToUse = () => {
  //       throw new Error();
  //     };
  //     const resultPromise = moduleRef.r.guard.canActivate(
  //       createMockExecutionContext(defaultInput),
  //     );
  //     await expect(resultPromise).rejects.toThrow(UnauthorizedException);
  //   });
  // });
});
