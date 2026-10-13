import { RequestJWTPayload } from "@auth/domain/login.entity";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

export type AuthenticatedSocketData = { user: RequestJWTPayload };

@Injectable()
export class WsAuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * Verifies the access token sent in the handshake (`auth.token`) with the
   * JwtModule's secret, audience and issuer, and stores its payload in
   * `socket.data.user`. Rejects when the token is missing or invalid.
   */
  async authenticate(socket: Socket): Promise<void> {
    const { token } = socket.handshake.auth as { token?: unknown };
    if (typeof token !== "string" || token === "") {
      throw new UnauthorizedException();
    }
    const user = await this.jwtService.verifyAsync<RequestJWTPayload>(token);
    (socket.data as AuthenticatedSocketData).user = user;
  }
}
