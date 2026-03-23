import { OnEvent } from "@nestjs/event-emitter";
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { SOCKET_MATCH_CREATED } from "@src/modules/exchange/domain/events/matchCreated.event";
import { WsAuthService } from "@src/modules/shared/socket/adapter/socketAuth.service";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  path: "/v1/socket.io",
  cors: {
    origin: "*",
  },
})
export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly wsAuthService: WsAuthService) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    this.wsAuthService.onClientConnect(client);
  }

  @OnEvent(SOCKET_MATCH_CREATED)
  handleUserCreatedEvent(event: unknown): void {
    this.server.emit(SOCKET_MATCH_CREATED, event);
  }
}
