import { OrderRepository } from "@exchange/database/order.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { ORDER_CREATED } from "@exchange/domain/events/orderCreated.event";
import { insufficientWalletFundsException } from "@exchange/domain/exchange.errors";
import { Order, OrderSideEnum } from "@exchange/domain/order.entity";
import { Wallet } from "@exchange/domain/wallet.entity";
import { CreateOrderDto } from "@exchange/dtos/order.dto";
import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, O, RE, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UUID } from "@shared/uuid/entities/uuid";
import { UserRepository } from "@user/database/user.repository.port";
import { userNotFoundException } from "@user/domain/user.errors";
import { PinoLogger } from "nestjs-pino";

export class CreateOrder implements ICommand {
  constructor(public readonly props: CreateOrderDto) {}
}

@CommandHandler(CreateOrder)
export class CreateOrderHandler implements ICommandHandler<CreateOrder, void> {
  constructor(
    private readonly uuidGeneratorService: RealUUIDGeneratorService,
    private readonly userRepository: UserRepository,
    private readonly orderRepository: OrderRepository,
    private readonly walletRepository: WalletRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("CreateOrder");
  }

  static walletChange(order: Order): Wallet {
    const isBuy = order.side === OrderSideEnum.Buy;
    return {
      id: order.userId,
      btc: isBuy ? 0 : -order.amount,
      usd: isBuy ? -(order.amount * order.price) : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  execute(command: CreateOrder): Promise<void> {
    this.logger.info(command.props, "CreateOrder command received");
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),
      RE.bind("id", () =>
        fromInputRE(UUID, "uuid")(this.uuidGeneratorService.generateUUID()),
      ),
      RE.chain(fromInputRE(Order, "Order")),
      RTE.fromReaderEither,

      // Check user exists
      RTE.tap((data) =>
        performRTE(this.userRepository.findById, "get user by id")(data.id),
      ),

      //Validate user exists
      RTE.tap(
        FPF.flow(
          (data) => data.userId,
          performRTE(this.userRepository.findById, "get order by id"),
          RTE.chainW(RTE.fromOption<Error>(userNotFoundException)),
        ),
      ),

      RTE.bindTo("order"),

      // Wallet change
      RTE.let("wallet", (data) =>
        FPF.pipe(CreateOrderHandler.walletChange(data.order)),
      ),

      // Verify Sufficient funds
      RTE.tap((data) =>
        FPF.pipe(
          data.wallet.id,
          performRTE(this.walletRepository.findById, "get wallet by id"),
          RTE.map(
            O.filter(
              (w) =>
                w.btc + data.wallet.btc >= 0 && w.usd + data.wallet.usd >= 0,
            ),
          ),
          RTE.chainW(RTE.fromOption<Error>(insufficientWalletFundsException)),
        ),
      ),

      // Store wallet
      RTE.tap((data) =>
        performRTE(
          this.walletRepository.save,
          "save wallet in storage system.",
        )(data.wallet),
      ),

      // Store entity
      RTE.tap((data) =>
        performRTE(
          this.orderRepository.save,
          "save order in storage system.",
        )(data.order),
      ),

      // //Emit domain event
      RTE.chain((data) =>
        performRTE(
          this.domainEventPublisher.publishEvent,
          "emit order created event.",
        )({
          eventKey: ORDER_CREATED,
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
