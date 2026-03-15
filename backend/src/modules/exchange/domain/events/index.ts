import { FPF } from "@shared/utils/application/monads";
import { MatchCreatedEvent } from "@src/modules/exchange/domain/events/matchCreated.event";
import { OrderCanceledEvent } from "@src/modules/exchange/domain/events/orderCanceled.event";
import { OrderCreatedEvent } from "@src/modules/exchange/domain/events/orderCreated.event";
import { PostStatisticsEvent } from "@src/modules/exchange/domain/events/postStatistics.event";
import { WalletCreatedEvent } from "@src/modules/exchange/domain/events/walletCreated.event";
export const AllExchangeEvents = FPF.tuple(
  OrderCreatedEvent,
  MatchCreatedEvent,
  WalletCreatedEvent,
  OrderCanceledEvent,
  //
  PostStatisticsEvent,
);
