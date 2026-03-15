import { O, TE } from "@shared/utils/application/monads";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";

/*  Most of repositories will probably need generic
    save/find/delete operations, so it's easier
    to have some shared interfaces.
    More specific queries should be defined
    in a respective repository.
*/

export class Paginated<T> {
  count: number;
  limit: number;
  page: number;
  data: T[];

  constructor(props: Paginated<T>) {
    this.count = props.count;
    this.limit = props.limit;
    this.page = props.page;
    this.data = props.data;
  }
}

export interface RepositoryFindAllPort<Entity, Query = undefined> {
  findAll(params?: { query?: Query }): TE.TaskEither<Error, Entity[]>;
}

export interface RepositoryFindByIdPort<Entity> {
  findById(id: string): TE.TaskEither<Error, O.Option<Entity>>;
}

export interface RepositoryFindAllPaginatedPort<Entity, Query = undefined> {
  findAllPaginated(
    params: PaginatedQueryParams<Query>,
  ): TE.TaskEither<Error, Paginated<Entity>>;
}

export interface RepositorySavePort<Entity> {
  save(entity: Partial<Entity>): TE.TaskEither<Error, void>;
}

export interface RepositoryDeleteByIdPort {
  deleteById(id: string): TE.TaskEither<Error, void>;
}

export interface RepositoryDefaultPort<Entity, Query = undefined>
  extends
    RepositoryFindAllPort<Entity, Query>,
    RepositoryFindByIdPort<Entity>,
    RepositoryFindAllPaginatedPort<Entity, Query>,
    RepositorySavePort<Entity>,
    RepositoryDeleteByIdPort {}
