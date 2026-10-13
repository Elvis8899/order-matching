import { RequestJWTPayload } from "@auth/domain/login.entity";
import { ExecutionContext } from "@nestjs/common";
import { BuilderPort } from "@test/util/builder.port";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UserRoleEnum } from "@user/domain/user.entity";

type AuthGuardMock = {
  canActivate: (context: ExecutionContext) => boolean;
};

export class MockAuthGuardBuilder extends BuilderPort<RequestJWTPayload> {
  protected override defaultProperties = {
    sub: createTestId(TableNameEnum.User, 0),
    username: "usuario 0",
    role: UserRoleEnum.Client,
    iat: 0,
    exp: 0,
    aud: "",
    iss: "",
  };

  constructor(index = 0) {
    super();
    this.defaultProperties.sub = createTestId(TableNameEnum.User, index);

    this.overrides = {
      ...this.defaultProperties,
    };
  }

  withSub(sub: string) {
    this.overrides.sub = sub;
    return this;
  }

  withRole(role: UserRoleEnum) {
    this.overrides.role = role;
    return this;
  }

  build(): AuthGuardMock {
    return {
      canActivate: this.canActivate.bind(this),
    };
  }

  buildPayload(): RequestJWTPayload {
    return {
      ...this.overrides,
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
