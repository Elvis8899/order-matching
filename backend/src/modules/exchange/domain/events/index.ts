import {
  MatchCreatedEvent,
  SocketMatchCreatedEvent,
} from "@exchange/domain/events/matchCreated.event";
import { OrderCanceledEvent } from "@exchange/domain/events/orderCanceled.event";
import { OrderCreatedEvent } from "@exchange/domain/events/orderCreated.event";
import { WalletCreatedEvent } from "@exchange/domain/events/walletCreated.event";
import { FPF } from "@shared/utils/application/monads";
export const AllExchangeEvents = FPF.tuple(
  OrderCreatedEvent,
  MatchCreatedEvent,
  WalletCreatedEvent,
  OrderCanceledEvent,
  //
  SocketMatchCreatedEvent,
);
