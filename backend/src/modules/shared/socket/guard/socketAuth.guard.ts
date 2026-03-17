import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { RequestJWTPayload } from "@src/modules/auth/domain/login.entity";
import { WsAuthService } from "@src/modules/shared/socket/adapter/socketAuth.service";
import { Socket } from "socket.io";

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly wsAuthService: WsAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    // wait until client data initialization will be finished
    await this.wsAuthService.finishInitialization(client);
    // your canActivate logic
    return !!(client.data as { user: RequestJWTPayload | null }).user?.sub;
  }
}
