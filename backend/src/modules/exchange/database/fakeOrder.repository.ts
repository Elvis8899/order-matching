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
      (minPrice === undefined || order.price >= minPrice) &&
      (maxPrice === undefined || order.price <= maxPrice);
  }

  /** Active orders of one side, summed per price level (best price first). */
  paginatedGroupedOrders = (
    params: PaginatedQueryParams<GroupedOrderQuery>,
  ): TE.TaskEither<Error, Paginated<GroupedOrder>> => {
    const { side } = params.query;
    const levels = () => {
      const byPrice = new Map<number, GroupedOrder>();
      for (const order of this.list(
        this.matchesQuery({ side, status: OrderStatusEnum.Active }),
      )) {
        const level = byPrice.get(order.price) ?? {
          price: order.price,
          amount: 0,
          volume: 0,
        };
        level.amount += order.amount;
        level.volume += order.price * order.amount;
        byPrice.set(order.price, level);
      }
      const direction = side === OrderSideEnum.Buy ? -1 : 1;
      return [...byPrice.values()].sort(
        (a, b) => direction * (a.price - b.price),
      );
    };
    return this.pageOf(levels)(params);
  };
}
