import {
  MatchFindQuery,
  MatchRepository,
} from "@exchange/database/match.repository.port";
import { Match, MatchStatistics } from "@exchange/domain/match.entity";
import { Injectable } from "@nestjs/common";
import { FPF, TE } from "@shared/utils/application/monads";
import { validateFromUnknown } from "@shared/utils/application/validateWith";
import { FakeRepository } from "@shared/utils/database/fakeRepository.base";
import { TaskEither } from "fp-ts/lib/TaskEither";

@Injectable()
export class FakeMatchRepository
  extends FakeRepository<Match, MatchFindQuery>
  implements MatchRepository
{
  protected readonly validate = validateFromUnknown(Match, "Match");

  protected matchesQuery({ userId, minDate }: MatchFindQuery = {}) {
    return (match: Match) =>
      (!userId || match.buyUserId === userId || match.sellUserId === userId) &&
      (!minDate || match.createdAt >= minDate);
  }

  getStatistics: () => TaskEither<Error, MatchStatistics> = () => {
    return FPF.pipe(
      this.findAll({
        query: {
          minDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      }),
      TE.bindTo("matchesLast24h"),
      TE.let("usdVolume24h", ({ matchesLast24h }) =>
        matchesLast24h.reduce((s, i) => s + i.volume, 0),
      ),
      TE.let("btcVolume24h", ({ matchesLast24h }) =>
        matchesLast24h.reduce((s, i) => s + i.volume / i.price, 0),
      ),
      TE.let("lastPrice", ({ matchesLast24h }) =>
        matchesLast24h[0] ? matchesLast24h[0].price : null,
      ),
      TE.let("prices", ({ matchesLast24h }) =>
        matchesLast24h.map((i) => i.price),
      ),
      TE.let("high24h", ({ prices }) =>
        prices.length > 0 ? Math.max(...prices) : null,
      ),
      TE.let("low24h", ({ prices }) =>
        prices.length > 0 ? Math.min(...prices) : null,
      ),
      TE.map(({ usdVolume24h, btcVolume24h, lastPrice, high24h, low24h }) => ({
        usdVolume24h,
        btcVolume24h,
        lastPrice,
        high24h,
        low24h,
      })),
    );
  };
}
