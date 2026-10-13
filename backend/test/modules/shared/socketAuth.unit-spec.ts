import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  AuthenticatedSocketData,
  WsAuthService,
} from "@shared/socket/adapter/socketAuth.service";
import { MockAuthGuardBuilder } from "@test/dataBuilders/mockAuthGuardBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import { unsafeCoerce } from "fp-ts/lib/function";
import { Socket } from "socket.io";

describe("[Unit] WsAuthService", () => {
  const authPayload = new MockAuthGuardBuilder().buildPayload();
  const socketWithToken = (token: unknown): Socket =>
    unsafeCoerce({ handshake: { auth: { token } }, data: {} });

  const moduleRef = new UnitModule(
    {
      providers: [
        WsAuthService,
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn(() => authPayload) },
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

  it("Should store the token's payload in the socket", async () => {
    // Given a socket with a valid token
    const socket = socketWithToken("token");

    // When it is authenticated
    await moduleRef.r.wsAuthService.authenticate(socket);

    // Then the socket holds the user
    expect(moduleRef.r.jwtSpy).toHaveBeenCalledWith("token");
    expect((socket.data as AuthenticatedSocketData).user).toEqual(authPayload);
  });

  it("Should reject an invalid token", async () => {
    // Given a token the JwtService rejects
    moduleRef.r.jwtSpy.mockRejectedValueOnce(new Error("invalid"));

    // Then authenticating fails
    await expect(
      moduleRef.r.wsAuthService.authenticate(socketWithToken("token")),
    ).rejects.toThrow("invalid");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not a string", 1],
  ])("Should reject a %s token without verifying it", async (_, token) => {
    await expect(
      moduleRef.r.wsAuthService.authenticate(socketWithToken(token)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(moduleRef.r.jwtSpy).not.toHaveBeenCalled();
  });
});
