import { CancelOrderHandler } from "@exchange/commands/cancelOrder/cancelOrder.command";
import { CancelOrderController } from "@exchange/commands/cancelOrder/cancelOrder.controller";
import { CreateOrderHandler } from "@exchange/commands/createOrder/createOrder.command";
import { CreateOrderController } from "@exchange/commands/createOrder/createOrder.controller";
import { CreateWalletHandler } from "@exchange/commands/createWallet/createWallet.command";
import { FindMatchHandler } from "@exchange/commands/findMatch/findMatch.command";
import { MatchRepository } from "@exchange/database/match.repository.port";
import { OrderRepository } from "@exchange/database/order.repository.port";
import { RealMatchRepository } from "@exchange/database/realMatch.repository";
import { RealOrderRepository } from "@exchange/database/realOrder.repository";
import { RealSettlementRepository } from "@exchange/database/realSettlement.repository";
import { RealWalletRepository } from "@exchange/database/realWallet.repository";
import { SettlementRepository } from "@exchange/database/settlement.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { CreatedOrderProcessor } from "@exchange/processors/createdOrder.processor";
import { GetWalletByIdController } from "@exchange/queries/getWalletById/getWalletById.controller";
import { GetWalletByIdQueryHandler } from "@exchange/queries/getWalletById/getWalletById.query";
import { MatchStatisticsController } from "@exchange/queries/matchStatistics/matchStatistics.controller";
import { MatchStatisticsQueryHandler } from "@exchange/queries/matchStatistics/matchStatistics.query";
import { PaginatedGroupedOrderController } from "@exchange/queries/paginatedGroupedOrders/paginatedGroupedOrders.controller";
import { PaginatedGroupedOrdersQueryHandler } from "@exchange/queries/paginatedGroupedOrders/paginatedGroupedOrders.query";
import { PaginatedMatchController } from "@exchange/queries/paginatedMatches/paginatedMatches.controller";
import { PaginatedMatchesQueryHandler } from "@exchange/queries/paginatedMatches/paginatedMatches.query";
import { PaginatedOrderController } from "@exchange/queries/paginatedOrders/paginatedOrders.controller";
import { PaginatedOrdersQueryHandler } from "@exchange/queries/paginatedOrders/paginatedOrders.query";
import { CreateMatchSubscriber } from "@exchange/subscribers/createMatch.subscriber";
import { CreateOrderSubscriber } from "@exchange/subscribers/createOrder.subscriber";
import { CreateUserSubscriber } from "@exchange/subscribers/createUser.subscriber";
import { Module, Provider } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { QueueModule } from "@shared/queue/queue.module";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { RealUserRepository } from "@user/database/realUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

const controllers = [
  CreateOrderController,
  GetWalletByIdController,
  PaginatedOrderController,
  PaginatedMatchController,
  CancelOrderController,
  MatchStatisticsController,
  //
  PaginatedGroupedOrderController,
];
const commandHandlers: Provider[] = [
  CreateWalletHandler,
  CreateOrderHandler,
  FindMatchHandler,
  CancelOrderHandler,
];
const queryHandlers: Provider[] = [
  MatchStatisticsQueryHandler,
  GetWalletByIdQueryHandler,
  PaginatedOrdersQueryHandler,
  PaginatedMatchesQueryHandler,
  PaginatedGroupedOrdersQueryHandler,
];
const subscribers = [
  CreateUserSubscriber,
  CreateOrderSubscriber,
  CreatedOrderProcessor,
  CreateMatchSubscriber,
];
const services = [RealUUIDGeneratorService];
const repositories = [
  {
    provide: WalletRepository,
    useClass: RealWalletRepository,
  },
  {
    provide: OrderRepository,
    useClass: RealOrderRepository,
  },
  { provide: MatchRepository, useClass: RealMatchRepository },
  { provide: SettlementRepository, useClass: RealSettlementRepository },
  {
    provide: UserRepository,
    useClass: RealUserRepository,
  },
];

@Module({
  imports: [QueueModule, CqrsModule],
  controllers: [...controllers],
  providers: [
    //...controllers,
    ...commandHandlers,
    ...queryHandlers,
    ...services,
    ...repositories,
    ...subscribers,
  ],
})
export class ExchangeModule {}
