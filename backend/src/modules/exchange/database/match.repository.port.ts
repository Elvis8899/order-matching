import { Match, MatchStatistics } from "@exchange/domain/match.entity";
import { O, TE } from "@shared/utils/application/monads";
import {
  Paginated,
  RepositoryDefaultPort,
} from "@shared/utils/database/repository.port";
import { DateType } from "@shared/utils/domain/DateType";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";
import { UUID } from "@shared/uuid/entities/uuid";
import z from "zod";

export const MatchFindQuery = z.object({
  userId: UUID.optional(),
  minDate: DateType.optional(),
});
export type MatchFindQuery = z.infer<typeof MatchFindQuery>;

export abstract class MatchRepository implements RepositoryDefaultPort<Match> {
  findById!: (id: string) => TE.TaskEither<Error, O.Option<Match>>;
  findAll!: (param?: {
    query?: MatchFindQuery;
  }) => TE.TaskEither<Error, Match[]>;
  findAllPaginated!: (
    params: PaginatedQueryParams<MatchFindQuery>,
  ) => TE.TaskEither<Error, Paginated<Match>>;
  deleteById!: (id: string) => TE.TaskEither<Error, void>;
  save!: (wallet: Match) => TE.TaskEither<Error, void>;
  getStatistics!: () => TE.TaskEither<Error, MatchStatistics>;
}
