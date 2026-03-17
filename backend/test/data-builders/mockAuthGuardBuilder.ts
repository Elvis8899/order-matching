import { RequestJWTPayload } from "@auth/domain/login.entity";
import { ExecutionContext } from "@nestjs/common";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";

type AuthGuardMock = {
  canActivate: (context: ExecutionContext) => boolean;
};

export class MockAuthGuardBuilder {
  private sub = createTestId(TableNameEnum.User, 1);
  private username = "admin@admin.com";
  private iat = 0;
  private exp = 0;
  private aud = "";
  private iss = "";

  private defaultProperties: RequestJWTPayload;
  private overrides: RequestJWTPayload;

  constructor(index = 1) {
    this.sub = createTestId(TableNameEnum.User, index);
    this.defaultProperties = {
      sub: this.sub,
      username: this.username,
      iat: this.iat,
      exp: this.exp,
      aud: this.aud,
      iss: this.iss,
    };
    this.overrides = {
      ...this.defaultProperties,
    };
  }

  reset() {
    this.overrides = {
      ...this.defaultProperties,
    };
    return this;
  }

  withSub(sub: string) {
    this.overrides.sub = sub;
    return this;
  }

  build(): AuthGuardMock {
    return {
      canActivate: this.canActivate.bind(this),
    };
  }
  private canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: RequestJWTPayload }>();
    request.user = { ...this.overrides };
    return true;
  }
}
