import { OrderRepository } from "@exchange/database/order.repository.port";
import { SettlementRepository } from "@exchange/database/settlement.repository.port";
import { ORDER_CANCELED } from "@exchange/domain/events/orderCanceled.event";
import { orderNotFoundException } from "@exchange/domain/exchange.errors";
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
import { FPF, O, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { UUID } from "@shared/uuid/entities/uuid";
import { PinoLogger } from "nestjs-pino";

export class CancelOrder implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
  ) {}
}

@CommandHandler(CancelOrder)
export class CancelOrderHandler implements ICommandHandler<CancelOrder, void> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly settlementRepository: SettlementRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("CancelOrder");
  }

  /** Returns the funds reserved for the part of the order not yet filled. */
  static walletChange(order: Order): Wallet {
    const isBuy = order.side === OrderSideEnum.Buy;
    const unfilled = order.amount - order.filled;
    return {
      id: order.userId,
      btc: isBuy ? 0 : unfilled,
      usd: isBuy ? unfilled * order.price : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  execute(command: CancelOrder): Promise<void> {
    this.logger.info(command.orderId, "CancelOrder command received");
    const task = FPF.pipe(
      //Data validation
      command.orderId,
      fromInputRE(UUID, "id"),
      RTE.fromReaderEither,

      // Validate Order exists
      RTE.chain(
        FPF.flow(
          performRTE(this.orderRepository.findById, "get order by id"),
          RTE.map(
            O.filter(
              (o) =>
                o.userId === command.userId &&
                o.status === OrderStatusEnum.Active,
            ),
          ),
          RTE.chain((_) => RTE.fromOption<Error>(orderNotFoundException)(_)),
        ),
      ),

      RTE.bindTo("order"),

      // Wallet change
      RTE.let("wallet", (data) =>
        FPF.pipe(CancelOrderHandler.walletChange(data.order)),
      ),

      // Cancel the order and refund it in one transaction. It fails if the
      // order was filled or cancelled since it was read.
      RTE.tap((data) =>
        performRTE(
          this.settlementRepository.settle,
          "cancel order and refund wallet in storage system.",
        )({
          orders: [
            {
              order: { ...data.order, status: OrderStatusEnum.Cancelled },
              readFilled: data.order.filled,
            },
          ],
          wallets: [data.wallet],
          matches: [],
        }),
      ),

      // Emit domain event
      RTE.chain((data) =>
        performRTE(
          this.domainEventPublisher.publishEvent,
          "emit order deleted event.",
        )({
          eventKey: ORDER_CANCELED,
          payload: {
            id: data.order.id,
          },
        }),
      ),
      RTE.map(noop),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
