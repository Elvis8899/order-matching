import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
} from "@exchange/domain/order.entity";
import { CreateOrderDto } from "@exchange/dtos/order.dto";
import { FPF } from "@shared/utils/application/monads";
import { UUID } from "@shared/uuid/entities/uuid";
import { BuilderPort } from "@test/util/builder.port";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { z } from "zod";

export class OrderBuilder extends BuilderPort<z.input<typeof Order>> {
  protected override defaultProperties = {
    id: UUID.parse(createTestId(TableNameEnum.Order, 0)),
    side: OrderSideEnum.Buy,
    price: 100,
    amount: 1,
    filled: 0,
    status: OrderStatusEnum.Active,
    userId: UUID.parse(createTestId(TableNameEnum.User, 0)),
  };
  constructor(index?: number) {
    super();
    if (index) {
      this.defaultProperties.id = createTestId(TableNameEnum.User, index);
    }
    this.overrides = {
      ...this.defaultProperties,
    };
  }

  withId(id: string) {
    this.overrides.id = id;
    return this;
  }

  withUserId(userId: string) {
    this.overrides.userId = userId;
    return this;
  }

  withStatus(status: OrderStatusEnum) {
    this.overrides.status = status;
    return this;
  }

  withSide(side: OrderSideEnum) {
    this.overrides.side = side;
    return this;
  }

  withAmount(amount: number) {
    this.overrides.amount = amount;
    return this;
  }

  withPrice(price: number) {
    this.overrides.price = price;
    return this;
  }

  build(): Order {
    return Order.parse({
      ...this.defaultProperties,
      ...this.overrides,
    });
  }

  buildCreateDTO(): CreateOrderDto {
    const user = {
      ...this.defaultProperties,
      ...this.overrides,
    };

    return FPF.unsafeCoerce({
      ...user,
    });
  }
}
