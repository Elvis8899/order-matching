import { OrderSideEnum, OrderStatusEnum } from "@exchange/domain/order.entity";
import { ApiProperty, OmitType } from "@nestjs/swagger";
import {
  Decimal,
  decimalApiProperty,
  DecimalInput,
} from "@shared/utils/domain/decimal";
import { BaseEntityDto } from "@shared/utils/dtos/baseEntity.dto";
import { PaginatedResponseDto } from "@shared/utils/dtos/paginated.response.base";

export class OrderDto extends BaseEntityDto {
  @ApiProperty({
    description: "Tipo de ordem - BUY ou SELL",
    required: true,
  })
  side!: OrderSideEnum;
  @ApiProperty(decimalApiProperty("Preço da ordem", "30000.5"))
  price!: Decimal;
  @ApiProperty(decimalApiProperty("Quantidade da ordem", "0.5"))
  amount!: Decimal;
  @ApiProperty(decimalApiProperty("Quantidade preenchida da ordem", "0.25"))
  filled!: Decimal;
  @ApiProperty({
    description: "Status da ordem",
    required: true,
  })
  status!: OrderStatusEnum;
  @ApiProperty({
    description: "ID do usuário",
    required: true,
  })
  userId!: string;
}

export class CreateOrderDto extends OmitType(OrderDto, [
  "id",
  "status",
  "price",
  "amount",
  "filled",
  "createdAt",
  "updatedAt",
]) {
  @ApiProperty(
    decimalApiProperty("Preço da ordem, com até 2 casas decimais", "30000.5"),
  )
  price!: DecimalInput;
  @ApiProperty(
    decimalApiProperty("Quantidade da ordem, com até 8 casas decimais", "0.5"),
  )
  amount!: DecimalInput;
}

export class PaginatedOrderResponseDto extends PaginatedResponseDto<OrderDto> {
  @ApiProperty({ type: OrderDto, isArray: true })
  data!: OrderDto[];
}
