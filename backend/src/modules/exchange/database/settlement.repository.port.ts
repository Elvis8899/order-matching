import { Match } from "@exchange/domain/match.entity";
import { Order } from "@exchange/domain/order.entity";
import { Wallet } from "@exchange/domain/wallet.entity";
import { TE } from "@shared/utils/application/monads";

/** An order's new fill, and the fill it had when the matching read it. */
export interface OrderFill {
  order: Order;
  readFilled: number;
}

/** Everything a matching run or a cancellation writes. Wallet amounts are
 * deltas. */
export interface Settlement {
  orders: OrderFill[];
  wallets: Wallet[];
  matches: Match[];
}

export abstract class SettlementRepository {
  /** Atomically updates the orders, moves the funds and stores the matches.
   * Fails with OrderChangedException, writing nothing, if any order is no
   * longer active or its fill changed since it was read. */
  settle!: (settlement: Settlement) => TE.TaskEither<Error, void>;
}
