import { hashPassword } from "@auth/util/password";
import { FPF } from "@shared/utils/application/monads";
import { UUID } from "@shared/uuid/entities/uuid";
import { BuilderPort } from "@test/util/builder.port";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { User, UserRoleEnum } from "@user/domain/user.entity";
import { CreateUserDto } from "@user/dtos/user.dto";
import { z } from "zod";

export class UserBuilder extends BuilderPort<z.input<typeof User>> {
  protected override defaultProperties = {
    id: UUID.parse(createTestId(TableNameEnum.User, 0)),
    username: "usuario 0",
    // Plain; tests that log in save buildWithHashedPassword() instead
    password: "password123",
    role: UserRoleEnum.Client,
  };
  constructor(index?: number) {
    super();
    if (index) {
      this.defaultProperties.id = createTestId(TableNameEnum.User, index);
      this.defaultProperties.username = "usuario " + index.toString();
    }
    this.overrides = {
      ...this.defaultProperties,
    };
  }

  withId(id: string) {
    this.overrides.id = id;
    return this;
  }

  withUsername(username: string) {
    this.overrides.username = username;
    return this;
  }

  withPassword(password: string) {
    this.overrides.password = password;
    return this;
  }

  withRole(role: UserRoleEnum) {
    this.overrides.role = role;
    return this;
  }

  build(): User {
    return User.parse({
      ...this.defaultProperties,
      ...this.overrides,
    });
  }

  /** The user as stored after signing up, with its password hashed. */
  async buildWithHashedPassword(): Promise<User> {
    const user = this.build();
    return { ...user, password: await hashPassword(user.password) };
  }

  buildCreateDTO(): CreateUserDto {
    const user = {
      ...this.defaultProperties,
      ...this.overrides,
    };

    return FPF.unsafeCoerce({
      ...user,
    });
  }
}
