import { ApiProperty, OmitType } from "@nestjs/swagger";
import { BaseEntityDto } from "@shared/utils/dtos/baseEntity.dto";
import { PaginatedResponseDto } from "@shared/utils/dtos/paginated.response.base";
import {
  OrderSideEnum,
  OrderStatusEnum,
} from "@src/modules/exchange/domain/order.entity";

export class OrderDto extends BaseEntityDto {
  @ApiProperty({
    description: "Tipo de ordem - BUY ou SELL",
    required: true,
  })
  side!: OrderSideEnum;
  @ApiProperty({
    description: "Preço da ordem",
    required: true,
  })
  price!: number;
  @ApiProperty({
    description: "Quantidade da ordem",
    required: true,
  })
  amount!: number;
  @ApiProperty({
    description: "Quantidade preenchida da ordem",
    required: false,
  })
  filled!: number;
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
  "filled",
  "createdAt",
  "updatedAt",
]) {}

export class PaginatedOrderResponseDto extends PaginatedResponseDto<OrderDto> {
  @ApiProperty({ type: OrderDto, isArray: true })
  data!: OrderDto[];
}
