import { FPF } from "@shared/utils/application/monads";
import { UUID } from "@shared/uuid/entities/uuid";
import { BuilderPort } from "@test/util/builder.port";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { User } from "@user/domain/user.entity";
import { CreateUserDto } from "@user/dtos/user.dto";
import { z } from "zod";

export class UserBuilder extends BuilderPort<z.input<typeof User>> {
  protected override defaultProperties = {
    id: UUID.parse(createTestId(TableNameEnum.User, 0)),
    username: "usuario 1",
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
