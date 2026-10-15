import {
  GroupedOrderQuery,
  OrderFindQuery,
  OrderRepository,
} from "@exchange/database/order.repository.port";
import {
  GroupedOrder,
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@exchange/domain/order.entity";
import { Injectable } from "@nestjs/common";
import { TE } from "@shared/utils/application/monads";
import { validateFromUnknown } from "@shared/utils/application/validateWith";
import { FakeRepository } from "@shared/utils/database/fakeRepository.base";
import { Paginated } from "@shared/utils/database/repository.port";
import { Decimal } from "@shared/utils/domain/decimal";
import { PaginatedQueryParams } from "@shared/utils/domain/query.base";

@Injectable()
export class FakeOrderRepository
  extends FakeRepository<Order, OrderFindQuery>
  implements OrderRepository
{
  protected readonly validate = validateFromUnknown(Order, "Order");

  protected matchesQuery({
    userId,
    side,
    status,
    maxDate,
    minPrice,
    maxPrice,
  }: OrderFindQuery = {}) {
    return (order: Order) =>
      (!userId || order.userId === userId) &&
      (!side || order.side === side) &&
      (!status || order.status === status) &&
      (!maxDate || order.createdAt <= maxDate) &&
      (minPrice === undefined || order.price.gte(minPrice)) &&
      (maxPrice === undefined || order.price.lte(maxPrice));
  }

  /** Active orders of one side, summed per price level (best price first). */
  paginatedGroupedOrders = (
    params: PaginatedQueryParams<GroupedOrderQuery>,
  ): TE.TaskEither<Error, Paginated<GroupedOrder>> => {
    const { side } = params.query;
    const levels = () => {
      // Keyed by the price's string, since equal Decimals are distinct objects
      const byPrice = new Map<string, GroupedOrder>();
      for (const order of this.list(
        this.matchesQuery({ side, status: OrderStatusEnum.Active }),
      )) {
        const key = order.price.toString();
        const level = byPrice.get(key) ?? {
          price: order.price,
          amount: new Decimal(0),
          volume: new Decimal(0),
        };
        const remaining = order.amount.sub(order.filled);
        level.amount = level.amount.add(remaining);
        level.volume = level.volume.add(order.price.mul(remaining));
        byPrice.set(key, level);
      }
      const direction = side === OrderSideEnum.Buy ? -1 : 1;
      return [...byPrice.values()].sort(
        (a, b) => direction * a.price.cmp(b.price),
      );
    };
    return this.pageOf(levels)(params);
  };
}
