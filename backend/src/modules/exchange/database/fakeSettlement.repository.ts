import { MatchRepository } from "@exchange/database/match.repository.port";
import { OrderRepository } from "@exchange/database/order.repository.port";
import {
  Settlement,
  SettlementRepository,
} from "@exchange/database/settlement.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { orderChangedException } from "@exchange/domain/exchange.errors";
import { OrderStatusEnum } from "@exchange/domain/order.entity";
import { Injectable } from "@nestjs/common";
import { A, FPF, O, TE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";

/** Settles through the other (fake) repositories, checking every order first. */
@Injectable()
export class FakeSettlementRepository implements SettlementRepository {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly walletRepository: WalletRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  settle = ({
    orders,
    wallets,
    matches,
  }: Settlement): TE.TaskEither<Error, void> =>
    FPF.pipe(
      orders,
      A.traverse(TE.ApplicativeSeq)(({ order, readFilled }) =>
        FPF.pipe(
          this.orderRepository.findById(order.id),
          TE.map(
            O.filter(
              (stored) =>
                stored.status === OrderStatusEnum.Active &&
                stored.filled.eq(readFilled),
            ),
          ),
          TE.chain(TE.fromOption<Error>(orderChangedException)),
        ),
      ),
      TE.chain(() =>
        A.sequence(TE.ApplicativeSeq)([
          ...orders.map(({ order }) => this.orderRepository.save(order)),
          ...wallets.map(this.walletRepository.save),
          ...matches.map(this.matchRepository.save),
        ]),
      ),
      TE.map(noop),
    );
}
