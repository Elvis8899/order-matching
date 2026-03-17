import { Module } from "@nestjs/common";
import { EventsGateway } from "@src/modules/shared/socket/adapter/socket.gateway";
import { WsAuthService } from "@src/modules/shared/socket/adapter/socketAuth.service";

@Module({
  imports: [],
  providers: [EventsGateway, WsAuthService],
  exports: [],
})
export class SocketModule {}
