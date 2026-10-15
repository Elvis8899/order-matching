import {
  OrderFindQuery,
  OrderRepository,
} from "@exchange/database/order.repository.port";
import {
  OrderFill,
  SettlementRepository,
} from "@exchange/database/settlement.repository.port";
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
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { A, Apply, FPF, RE, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { Decimal, USD_SCALE } from "@shared/utils/domain/decimal";
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
    private readonly settlementRepository: SettlementRepository,
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
    orders: OrderFill[];
    matches: PartialMatch[];
  } {
    const isBuy = order.side === OrderSideEnum.Buy;
    let amountRemaining = order.amount.sub(order.filled);
    const matches: PartialMatch[] = [];
    const wallets: PartialWallet[] = [];
    const orders: OrderFill[] = [];
    const manageWallet = (wallet: PartialWallet) => {
      const existingWallet = wallets.find((w) => w.id === wallet.id);
      if (!existingWallet) {
        wallets.push(wallet);
        return;
      }
      existingWallet.btc = existingWallet.btc.add(wallet.btc);
      existingWallet.usd = existingWallet.usd.add(wallet.usd);
    };
    const getNewStatus = (amount: Decimal, filled: Decimal) => {
      return filled.eq(amount)
        ? OrderStatusEnum.Complete
        : OrderStatusEnum.Active;
    };
    // Fees are the only amounts rounded: a cent price times a satoshi amount
    // is exact at USD_SCALE, but a fee rate adds three more places
    const fee = (rate: Decimal, volume: Decimal) =>
      volume.mul(rate).toDecimalPlaces(USD_SCALE);
    const zero = new Decimal(0);
    for (const match of matchingOrders.sort((a, b) =>
      isBuy ? b.price.cmp(a.price) : a.price.cmp(b.price),
    )) {
      const price = isBuy ? match.price : order.price;
      const amount = Decimal.min(
        amountRemaining,
        match.amount.sub(match.filled),
      );
      const volume = amount.mul(price);
      const filled = match.filled.add(amount);
      // The buyer reserved USD at their own price; return what the trade
      // price saved them
      const buyerRefund = (isBuy ? order : match).price.sub(price).mul(amount);
      manageWallet({
        id: order.userId,
        btc: isBuy ? amount : zero,
        usd: (isBuy ? buyerRefund : volume).sub(fee(MATCH_TAKER_FEE, volume)),
      });
      manageWallet({
        id: match.userId,
        btc: isBuy ? zero : amount,
        usd: (isBuy ? volume : buyerRefund).sub(fee(MATCH_MAKER_FEE, volume)),
      });
      matches.push({
        price: price,
        volume: volume,
        buyOrderId: isBuy ? order.id : match.id,
        sellOrderId: isBuy ? match.id : order.id,
        buyUserId: isBuy ? order.userId : match.userId,
        sellUserId: isBuy ? match.userId : order.userId,
      });
      amountRemaining = amountRemaining.sub(amount);
      orders.push({
        order: { ...match, filled, status: getNewStatus(match.amount, filled) },
        readFilled: match.filled,
      });
      if (!amountRemaining.isPositive() || amountRemaining.isZero()) {
        break;
      }
    }
    const filled = order.amount.sub(amountRemaining);
    orders.push({
      order: { ...order, filled, status: getNewStatus(order.amount, filled) },
      readFilled: order.filled,
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
      // Nothing matched: the order is unchanged, so there is nothing to save
      RTE.tap((data) =>
        data.matches.length === 0
          ? RTE.right(undefined)
          : performRTE(
              this.settlementRepository.settle,
              "save matches, orders and wallets in storage system.",
            )(data),
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
