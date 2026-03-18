import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, O, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { UUID } from "@shared/uuid/entities/uuid";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import { ORDER_CANCELED } from "@src/modules/exchange/domain/events/orderCanceled.event";
import { orderNotFoundException } from "@src/modules/exchange/domain/exchange.errors";
import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@src/modules/exchange/domain/order.entity";
import { Wallet } from "@src/modules/exchange/domain/wallet.entity";
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
    private readonly walletRepository: WalletRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("CancelOrder");
  }

  static walletChange(order: Order): Wallet {
    const isBuy = order.side === OrderSideEnum.Buy;
    return {
      id: order.userId,
      btc: isBuy ? 0 : order.amount,
      usd: isBuy ? order.amount * order.price : 0,
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

      // Cancel entity
      RTE.tap((data) =>
        performRTE(
          this.orderRepository.save,
          "delete order in storage system.",
        )({ ...data.order, status: OrderStatusEnum.Cancelled }),
      ),

      // Store wallet
      RTE.tap((data) =>
        performRTE(
          this.walletRepository.save,
          "save wallet in storage system.",
        )(data.wallet),
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
