import { MatchRepository } from "@exchange/database/match.repository.port";
import {
  OrderFindQuery,
  OrderRepository,
} from "@exchange/database/order.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { MATCH_CREATED } from "@exchange/domain/events/matchCreated.event";
import { orderNotFoundException } from "@exchange/domain/exchange.errors";
import {
  Match,
  MATCH_MAKER_FEE,
  MATCH_TAKER_FEE,
} from "@exchange/domain/match.entity";
import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@exchange/domain/order.entity";
import { Wallet } from "@exchange/domain/wallet.entity";
import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { A, Apply, FPF, RE, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { PinoLogger } from "nestjs-pino";

type PartialMatch = Omit<Match, "id" | "createdAt" | "updatedAt">;
type PartialWallet = Omit<Wallet, "createdAt" | "updatedAt">;
export class FindMatch implements ICommand {
  constructor(public readonly props: { id: string }) {}
}

@CommandHandler(FindMatch)
export class FindMatchHandler implements ICommandHandler<FindMatch, void> {
  constructor(
    private readonly uuidGeneratorService: RealUUIDGeneratorService,
    private readonly orderRepository: OrderRepository,
    private readonly walletRepository: WalletRepository,
    private readonly matchRepository: MatchRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("FindMatch");
  }

  static orderQueryFromOrder(order: Order): { query: OrderFindQuery } {
    const isBuy = order.side === OrderSideEnum.Buy;
    return {
      query: {
        status: OrderStatusEnum.Active,
        side: isBuy ? OrderSideEnum.Sell : OrderSideEnum.Buy,
        minPrice: isBuy ? undefined : order.price,
        maxPrice: isBuy ? order.price : undefined,
        maxDate: order.createdAt,
      },
    };
  }

  static getMatches(
    order: Order,
    matchingOrders: Order[],
  ): {
    wallets: PartialWallet[];
    orders: Order[];
    matches: PartialMatch[];
  } {
    const isBuy = order.side === OrderSideEnum.Buy;
    let amountRemaining = order.amount - order.filled;
    const matches: PartialMatch[] = [];
    const wallets: PartialWallet[] = [];
    const orders: Order[] = [];
    const manageWallet = (wallet: { id: string; btc: number; usd: number }) => {
      const existingWallet = wallets.find((w) => w.id === wallet.id);
      if (!existingWallet) {
        wallets.push(wallet);
        return;
      }
      existingWallet.btc += wallet.btc;
      existingWallet.usd += wallet.usd;
    };
    const getNewStatus = (amount: number, filled: number) => {
      return filled === amount
        ? OrderStatusEnum.Complete
        : OrderStatusEnum.Active;
    };
    for (const match of matchingOrders.sort((a, b) =>
      isBuy ? b.price - a.price : a.price - b.price,
    )) {
      const price = isBuy ? match.price : order.price;
      const amount = Math.min(amountRemaining, match.amount - match.filled);
      const volume = amount * price;
      const filled = match.filled + amount;
      manageWallet({
        id: order.userId,
        btc: isBuy ? amount : 0,
        usd: (isBuy ? 0 : volume) - MATCH_TAKER_FEE * volume,
      });
      manageWallet({
        id: match.userId,
        btc: isBuy ? 0 : amount,
        usd: (isBuy ? volume : 0) - MATCH_MAKER_FEE * volume,
      });
      matches.push({
        price: price,
        volume: volume,
        buyOrderId: isBuy ? order.id : match.id,
        sellOrderId: isBuy ? match.id : order.id,
        buyUserId: isBuy ? order.userId : match.userId,
        sellUserId: isBuy ? match.userId : order.userId,
      });
      amountRemaining -= amount;
      orders.push({
        ...match,
        filled,
        status: getNewStatus(match.amount, filled),
      });
      if (amountRemaining <= 0) {
        break;
      }
    }
    const filled = order.amount - amountRemaining;
    orders.push({
      ...order,
      filled,
      status: getNewStatus(order.amount, filled),
    });
    return { wallets, matches, orders };
  }

  execute(command: FindMatch): Promise<void> {
    this.logger.info(command.props, "FindMatch command received");
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),

      RTE.fromReaderEither,

      // Find Order exists
      RTE.chain((data) =>
        performRTE(this.orderRepository.findById, "get order by id")(data.id),
      ),

      RTE.chainW(RTE.fromOption<Error>(orderNotFoundException)),
      RTE.bindTo("order"),

      RTE.bind("matches", ({ order }) =>
        performRTE(
          this.orderRepository.findAll,
          "get matches by order id",
        )(FindMatchHandler.orderQueryFromOrder(order)),
      ),

      RTE.map((data) => FindMatchHandler.getMatches(data.order, data.matches)),
      RTE.chain((data) =>
        Apply.sequenceS(RTE.ApplicativePar)({
          wallets: FPF.pipe(
            data.wallets,
            A.traverse(RE.Applicative)(fromInputRE(Wallet, "Wallet")),
            RTE.fromReaderEither,
          ),
          matches: FPF.pipe(
            data.matches,
            A.map((match) => {
              return {
                ...match,
                id: this.uuidGeneratorService.generateUUID(),
              };
            }),
            A.traverse(RE.Applicative)(fromInputRE(Match, "Match")),
            RTE.fromReaderEither,
          ),
          orders: RTE.of(data.orders),
        }),
      ),
      RTE.tap((data) =>
        Apply.sequenceS(RTE.ApplicativePar)({
          wallets: A.sequence(RTE.ApplicativePar)(
            data.wallets.map(
              performRTE(
                this.walletRepository.save,
                "save wallet in storage system.",
              ),
            ),
          ),
          matches: A.sequence(RTE.ApplicativePar)(
            data.matches.map(
              performRTE(
                this.matchRepository.save,
                "save match in storage system.",
              ),
            ),
          ),
          orders: A.sequence(RTE.ApplicativePar)(
            data.orders.map(
              performRTE(
                this.orderRepository.save,
                "save order in storage system.",
              ),
            ),
          ),
        }),
      ),

      //Emit domain event
      RTE.chain((data) =>
        performRTE(
          this.domainEventPublisher.publishEvent,
          "emit order created event.",
        )({
          eventKey: MATCH_CREATED,
          payload: {
            ids: data.matches.map((m) => m.id),
            userIds: data.wallets.map((m) => m.id),
          },
        }),
      ),
      RTE.map(noop),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
