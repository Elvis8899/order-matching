import { SOCKET_MATCH_CREATED } from "@exchange/domain/events/matchCreated.event";
import { OnEvent } from "@nestjs/event-emitter";
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import {
  AuthenticatedSocketData,
  WsAuthService,
} from "@shared/socket/adapter/socketAuth.service";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  path: "/v1/socket.io",
  cors: {
    origin: "*",
  },
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly wsAuthService: WsAuthService) {}

  // Connections without a valid access token are refused during the
  // handshake: the client gets a connect_error and no events
  afterInit(server: Server) {
    server.use((socket, next) => {
      this.wsAuthService.authenticate(socket).then(
        () => {
          next();
        },
        () => {
          next(new Error("Unauthorized"));
        },
      );
    });
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    const { user } = client.data as AuthenticatedSocketData;
    await client.join([user.sub, "statistics"]);
  }

  @OnEvent(SOCKET_MATCH_CREATED)
  handleUserCreatedEvent(event: unknown): void {
    this.server.emit(SOCKET_MATCH_CREATED, event);
  }
}
