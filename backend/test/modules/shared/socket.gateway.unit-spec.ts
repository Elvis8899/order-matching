import { SocketGateway } from "@shared/socket/adapter/socket.gateway";
import { WsAuthService } from "@shared/socket/adapter/socketAuth.service";
import { MockAuthGuardBuilder } from "@test/dataBuilders/mockAuthGuardBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import { unsafeCoerce } from "fp-ts/lib/function";
import { Server, Socket } from "socket.io";

type Middleware = (socket: Socket, next: (err?: Error) => void) => void;

describe("[Unit] Socket Gateway", () => {
  const mod = new UnitModule(
    {
      providers: [
        SocketGateway,
        {
          provide: WsAuthService,
          useValue: { authenticate: jest.fn(() => Promise.resolve()) },
        },
      ],
    },
    (app) => ({
      gateway: app.get(SocketGateway),
      authenticate: jest.spyOn(app.get(WsAuthService), "authenticate"),
      server: { emit: jest.fn(), use: jest.fn() },
    }),
  );
  beforeEach(async () => {
    await mod.init();
    Object.assign(mod.r.gateway, { server: mod.r.server });
  });

  // Registers the handshake middleware and runs it for one socket
  const runMiddleware = async (): Promise<Error | undefined> => {
    mod.r.gateway.afterInit(unsafeCoerce<unknown, Server>(mod.r.server));
    const [middleware] = mod.r.server.use.mock.calls[0] as [Middleware];
    return new Promise((resolve) => {
      middleware(unsafeCoerce({}), resolve);
    });
  };

  it("Should accept a handshake that authenticates", async () => {
    await expect(runMiddleware()).resolves.toBeUndefined();
    expect(mod.r.authenticate).toHaveBeenCalledTimes(1);
  });

  it("Should refuse a handshake that does not authenticate", async () => {
    mod.r.authenticate.mockRejectedValueOnce(new Error("invalid"));

    const error = await runMiddleware();

    expect(error?.message).toBe("Unauthorized");
  });

  it("Should join the user's room on connection", async () => {
    const user = new MockAuthGuardBuilder().buildPayload();
    const socket = { data: { user }, join: jest.fn() };

    await mod.r.gateway.handleConnection(unsafeCoerce(socket));

    expect(socket.join).toHaveBeenCalledWith([user.sub, "statistics"]);
  });

  it("should emit on SOCKET_MATCH_CREATED event", () => {
    mod.r.gateway.handleUserCreatedEvent({});

    expect(mod.r.server.emit).toHaveBeenCalledTimes(1);
  });
});
