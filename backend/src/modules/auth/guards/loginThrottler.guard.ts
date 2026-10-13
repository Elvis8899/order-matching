import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Limits login attempts per client IP and username. Including the username
 * keeps the limit per account when every request arrives from the same proxy
 * IP (see TRUST_PROXY), instead of sharing one limit between all users.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: {
    ip?: string;
    body?: { username?: unknown };
  }): Promise<string> {
    const username =
      typeof req.body?.username === "string"
        ? req.body.username.toLowerCase()
        : "";
    return Promise.resolve(`${req.ip ?? ""}:${username}`);
  }
}
