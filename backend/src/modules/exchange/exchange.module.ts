import { Module, Provider } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { CreateOrderHandler } from "@src/modules/exchange/commands/createOrder/createOrder.command";
import { CreateOrderController } from "@src/modules/exchange/commands/createOrder/createOrder.controller";
import { CreateWalletHandler } from "@src/modules/exchange/commands/createWallet/createWallet.command";
import { CancelOrderHandler } from "@src/modules/exchange/commands/deleteOrder/cancelOrder.command";
import { CancelOrderController } from "@src/modules/exchange/commands/deleteOrder/cancelOrder.controller";
import { FindMatchHandler } from "@src/modules/exchange/commands/findMatch/findMatch.command";
import { MatchRepository } from "@src/modules/exchange/database/match.repository.port";
import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import { RealMatchRepository } from "@src/modules/exchange/database/realMatch.repository";
import { RealOrderRepository } from "@src/modules/exchange/database/realOrder.repository";
import { RealWalletRepository } from "@src/modules/exchange/database/realWallet.repository";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import { OrderCreatedProcessor } from "@src/modules/exchange/processors/orderCreated.processor";
import { GetWalletByIdController } from "@src/modules/exchange/queries/getWalletById/getWalletById.controller";
import { GetWalletByIdQueryHandler } from "@src/modules/exchange/queries/getWalletById/getWalletById.query";
import { MatchStatisticsController } from "@src/modules/exchange/queries/matchStatistics/matchStatistics.controller";
import { MatchStatisticsQueryHandler } from "@src/modules/exchange/queries/matchStatistics/matchStatistics.query";
import { PaginatedMatchController } from "@src/modules/exchange/queries/paginatedMatches/paginatedMatches.controller";
import { PaginatedMatchesQueryHandler } from "@src/modules/exchange/queries/paginatedMatches/paginatedMatches.query";
import { PaginatedOrderController } from "@src/modules/exchange/queries/paginatedOrders/paginatedOrders.controller";
import { PaginatedOrdersQueryHandler } from "@src/modules/exchange/queries/paginatedOrders/paginatedOrders.query";
import { MatchCreatedSubscriber } from "@src/modules/exchange/subscribers/matchCreated.subscriber";
import { OrderCreatedSubscriber } from "@src/modules/exchange/subscribers/orderCreated.subscriber";
import { UserCreatedSubscriber } from "@src/modules/exchange/subscribers/userCreated.subscriber";
import { QueueModule } from "@src/modules/shared/queue/queue.module";
import { RealUserRepository } from "@src/modules/user/database/realUser.repository";
import { UserRepository } from "@src/modules/user/database/user.repository.port";

const controllers = [
  CreateOrderController,
  GetWalletByIdController,
  PaginatedOrderController,
  PaginatedMatchController,
  CancelOrderController,
  MatchStatisticsController,
  //
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
];
const subscribers = [
  UserCreatedSubscriber,
  OrderCreatedSubscriber,
  OrderCreatedProcessor,
  MatchCreatedSubscriber,
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
