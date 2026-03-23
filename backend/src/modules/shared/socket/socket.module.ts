import { Module } from "@nestjs/common";
import { SocketGateway } from "@src/modules/shared/socket/adapter/socket.gateway";
import { WsAuthService } from "@src/modules/shared/socket/adapter/socketAuth.service";

@Module({
  imports: [],
  providers: [SocketGateway, WsAuthService],
  exports: [],
})
export class SocketModule {}
