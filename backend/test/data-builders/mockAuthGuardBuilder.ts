import { RequestJWTPayload } from "@auth/domain/login.entity";
import { ExecutionContext } from "@nestjs/common";
import { BuilderPort } from "@test/util/builder.port";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";

type AuthGuardMock = {
  canActivate: (context: ExecutionContext) => boolean;
};

export class MockAuthGuardBuilder extends BuilderPort<RequestJWTPayload> {
  protected override defaultProperties = {
    sub: createTestId(TableNameEnum.User, 0),
    username: "admin@admin.com",
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
