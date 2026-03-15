import { OnEvent } from "@nestjs/event-emitter";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { POST_STATISTICS } from "@src/modules/exchange/domain/events/postStatistics.event";
import { Server } from "socket.io";

@WebSocketGateway({
  path: "/v1/socket.io",
  cors: {
    origin: "*",
  },
})
export class EventsGateway {
  @WebSocketServer()
  private server!: Server;

  @OnEvent(POST_STATISTICS)
  handleUserCreatedEvent(event: unknown): void {
    this.server.emit(POST_STATISTICS, event);
  }
}
