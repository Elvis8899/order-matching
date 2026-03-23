import { SocketGateway } from "@src/modules/shared/socket/adapter/socket.gateway";
import { WsAuthService } from "@src/modules/shared/socket/adapter/socketAuth.service";
import { UnitModule } from "@test/util/defaultModule.unit";
import { unsafeCoerce } from "fp-ts/lib/function";
import { Socket } from "socket.io";

describe("[Unit] Socket Gateway", () => {
  const mod = new UnitModule(
    {
      providers: [
        SocketGateway,
        {
          provide: WsAuthService,
          useValue: {
            onClientConnect: jest.fn(),
          },
        },
      ],
    },
    (app) => ({
      gateway: app.get(SocketGateway),
      authService: app.get(WsAuthService),
      server: { emit: jest.fn() },
    }),
  );
  beforeEach(async () => {
    await mod.init();
    Object.assign(mod.r.gateway, { server: mod.r.server });
  });

  it("should call authService.onClientConnect", () => {
    const socketMock: Socket = unsafeCoerce({});

    mod.r.gateway.handleConnection(socketMock);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- Not called
    expect(mod.r.authService.onClientConnect).toHaveBeenCalledTimes(1);
  });

  it("should emit on SOCKET_MATCH_CREATED event", () => {
    const socketMock: Socket = unsafeCoerce({});

    mod.r.gateway.handleUserCreatedEvent(socketMock);

    expect(mod.r.server.emit).toHaveBeenCalledTimes(1);
  });
});
