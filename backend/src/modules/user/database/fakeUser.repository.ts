import { Injectable } from "@nestjs/common";
import { O, TE } from "@shared/utils/application/monads";
import { validateFromUnknown } from "@shared/utils/application/validateWith";
import { FakeRepository } from "@shared/utils/database/fakeRepository.base";
import { validateMaybeRow } from "@shared/utils/database/rowValidation";
import { UserRepository } from "@user/database/user.repository.port";
import { User } from "@user/domain/user.entity";

@Injectable()
export class FakeUserRepository
  extends FakeRepository<User>
  implements UserRepository
{
  protected readonly validate = validateFromUnknown(User, "User");

  findByUsername = (username: string): TE.TaskEither<Error, O.Option<User>> =>
    TE.fromEither(
      validateMaybeRow(this.validate)(
        O.toUndefined(this.first((user) => user.username === username)),
      ),
    );

  incrementTokenVersion = (userId: string): TE.TaskEither<Error, void> => {
    const user = this.rows.get(userId);
    return user
      ? this.save({ id: userId, tokenVersion: user.tokenVersion + 1 })
      : TE.of(undefined);
  };
}
