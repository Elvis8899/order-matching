import { FPF } from "@shared/utils/application/monads";
import { UUID } from "@shared/uuid/entities/uuid";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { User } from "@user/domain/user.entity";
import { CreateUserDto } from "@user/dtos/user.dto";
import { z } from "zod";

export class UserBuilder {
  private id = UUID.parse(createTestId(TableNameEnum.User, 0));

  private username = "usuario 1";
  private defaultProperties: z.input<typeof User>;
  private overrides: z.input<typeof User>;

  constructor(index?: number) {
    if (index) {
      this.username = "usuario " + index.toString();
      this.id = createTestId(TableNameEnum.User, index);
    }
    this.defaultProperties = {
      id: this.id,
      username: this.username,
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

  withId(id: string) {
    this.overrides.id = id;
    return this;
  }

  withUsername(username: string) {
    this.overrides.username = username;
    return this;
  }

  build(): User {
    return User.parse({
      ...this.defaultProperties,
      ...this.overrides,
    });
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
