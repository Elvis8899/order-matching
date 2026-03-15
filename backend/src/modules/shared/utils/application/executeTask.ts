import { E, TE } from "@shared/utils/application/monads";

/**
 * Given a taskEither, execute the task, await the result and return a promise.
 * It is used a lot as nest rely pretty heavily on Promise
 *
 * @param task: a TaskEither
 */
export const executeTask = <E, A>(task: TE.TaskEither<E, A>): Promise<A> =>
  new Promise((resolve, reject) => {
    (async () => {
      const result = await task();
      E.fold(reject, resolve)(result);
    })().catch(reject);
  });
