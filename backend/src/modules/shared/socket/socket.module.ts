import { Module } from "@nestjs/common";
import { EventsGateway } from "@src/modules/shared/socket/socket.gateway";
import { WsAuthService } from "@src/modules/shared/socket/socketAuth.service";

@Module({
  imports: [],
  providers: [EventsGateway, WsAuthService],
  exports: [],
})
export class SocketModule {}
