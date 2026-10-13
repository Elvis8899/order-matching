import { RequestJWTPayload } from "@auth/domain/login.entity";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

@Injectable()
export class WsAuthService {
  constructor(private jwtService: JwtService) {}

  private initializationMap = new Map<string, Promise<unknown>>();

  onClientConnect(socket: Socket) {
    this.initializationMap.set(socket.id, this.initialize(socket));
  }

  async finishInitialization(socket: Socket): Promise<void> {
    await this.initializationMap.get(socket.id);
  }

  private async initialize(socket: Socket): Promise<void> {
    // asynchronously get user data

    const token = socket.handshake.auth.token as string;
    try {
      // 💡 Here the JWT secret key that's used for verifying the payload
      // is the key that was passsed in the JwtModule
      const payload =
        await this.jwtService.verifyAsync<RequestJWTPayload>(token);
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      (socket.data as { user: RequestJWTPayload | null }).user = payload;

      await socket.join(payload.sub);
      await socket.join("statistics");
    } catch {
      (socket.data as { user: RequestJWTPayload | null }).user = null;
    }
    this.initializationMap.delete(socket.id);
  }
}
