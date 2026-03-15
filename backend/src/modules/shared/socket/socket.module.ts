import { Module } from "@nestjs/common";
import { EventsGateway } from "@src/modules/shared/socket/socket.gateway";

@Module({
  imports: [],
  providers: [EventsGateway],
  exports: [],
})
export class SocketModule {}
