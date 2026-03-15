import { O, TE } from "@shared/utils/application/monads";
import {
  Paginated,
  RepositoryDefaultPort,
} from "@shared/utils/database/repository.port";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";
import { Wallet } from "@src/modules/exchange/domain/wallet.entity";

export abstract class WalletRepository implements RepositoryDefaultPort<Wallet> {
  findById!: (id: string) => TE.TaskEither<Error, O.Option<Wallet>>;
  findAll!: () => TE.TaskEither<Error, Wallet[]>;
  findAllPaginated!: (
    params: PaginatedQueryParams,
  ) => TE.TaskEither<Error, Paginated<Wallet>>;
  deleteById!: (id: string) => TE.TaskEither<Error, void>;
  save!: (wallet: Wallet) => TE.TaskEither<Error, void>;
}
