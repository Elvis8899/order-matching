import { O, TE } from "@shared/utils/application/monads";
import {
  Paginated,
  RepositoryDefaultPort,
} from "@shared/utils/database/repository.port";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";
import { User } from "@user/domain/user.entity";

export abstract class UserRepository implements RepositoryDefaultPort<User> {
  findById!: (id: string) => TE.TaskEither<Error, O.Option<User>>;
  findByUsername!: (username: string) => TE.TaskEither<Error, O.Option<User>>;
  findAll!: () => TE.TaskEither<Error, User[]>;
  findAllPaginated!: (
    params: PaginatedQueryParams,
  ) => TE.TaskEither<Error, Paginated<User>>;
  deleteById!: (id: string) => TE.TaskEither<Error, void>;
  save!: (user: User) => TE.TaskEither<Error, void>;
}
