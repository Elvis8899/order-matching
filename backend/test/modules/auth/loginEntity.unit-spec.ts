import { toRequester } from "@auth/domain/login.entity";
import { MockAuthGuardBuilder } from "@test/dataBuilders/mockAuthGuardBuilder";
import { UserRoleEnum } from "@user/domain/user.entity";

describe("[Unit] toRequester", () => {
  it("Should take the requester from the access token's subject and role", () => {
    const payload = new MockAuthGuardBuilder(3)
      .withRole(UserRoleEnum.Admin)
      .buildPayload();

    expect(toRequester(payload)).toEqual({
      id: payload.sub,
      role: UserRoleEnum.Admin,
    });
  });
});
