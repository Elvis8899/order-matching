import { E, O, TE } from "@shared/utils/application/monads";
import {
  Paginated,
  RepositoryDefaultPort,
} from "@shared/utils/database/repository.port";
import {
  loadPage,
  RowValidator,
  validateMaybeRow,
  validateRows,
} from "@shared/utils/database/rowValidation";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";

/**
 * In-memory stand-in for a Prisma repository, used by the unit tests.
 * Rows are kept by id, in insertion order.
 */
export abstract class FakeRepository<
  Entity extends { id: string },
  Query = undefined,
> implements RepositoryDefaultPort<Entity, Query> {
  protected readonly rows = new Map<string, Entity>();

  protected abstract readonly validate: RowValidator<Entity>;

  /** Which rows a query selects. Repositories with filters override it. */
  protected matchesQuery(_query?: Query): (row: Entity) => boolean {
    return () => true;
  }

  /** How saved fields combine with the stored row. Defaults to overwriting. */
  protected merge(stored: Entity, update: Partial<Entity>): Entity {
    return { ...stored, ...update };
  }

  protected list(matches: (row: Entity) => boolean): Entity[] {
    return [...this.rows.values()].filter(matches);
  }

  protected first(matches: (row: Entity) => boolean): O.Option<Entity> {
    return O.fromNullable(this.list(matches)[0]);
  }

  /** Paginates already-selected rows, validating each with `toItems`. */
  protected pageOf<T>(
    selected: () => T[],
    toItems: (rows: T[]) => E.Either<Error, T[]> = E.right,
  ) {
    return loadPage(
      {
        rows: ({ skip, take }) => TE.of(selected().slice(skip, skip + take)),
        total: () => TE.of(selected().length),
      },
      toItems,
    );
  }

  findAll = (params?: { query?: Query }): TE.TaskEither<Error, Entity[]> =>
    TE.fromEither(
      validateRows(this.validate)(this.list(this.matchesQuery(params?.query))),
    );

  findAllPaginated = (
    params: PaginatedQueryParams<Query>,
  ): TE.TaskEither<Error, Paginated<Entity>> => {
    const query = "query" in params ? params.query : undefined;
    return this.pageOf(
      () => this.list(this.matchesQuery(query)),
      validateRows(this.validate),
    )(params);
  };

  findById = (id: string): TE.TaskEither<Error, O.Option<Entity>> =>
    TE.fromEither(validateMaybeRow(this.validate)(this.rows.get(id)));

  /** Inserts the row, or merges the given fields into the stored one. */
  save = (entity: Partial<Entity>): TE.TaskEither<Error, void> => {
    const id = entity.id as string;
    const stored = this.rows.get(id);
    this.rows.set(id, stored ? this.merge(stored, entity) : (entity as Entity));
    return TE.of(undefined);
  };

  deleteById = (id: string): TE.TaskEither<Error, void> => {
    this.rows.delete(id);
    return TE.of(undefined);
  };
}
