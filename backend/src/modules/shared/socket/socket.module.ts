import { Module } from "@nestjs/common";
import { SocketGateway } from "@shared/socket/adapter/socket.gateway";
import { WsAuthService } from "@shared/socket/adapter/socketAuth.service";

@Module({
  imports: [],
  providers: [SocketGateway, WsAuthService],
  exports: [],
})
export class SocketModule {}
