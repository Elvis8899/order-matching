import { AuthGuard } from "@auth/guards/auth.guard";
import { GroupedOrderQuery } from "@exchange/database/order.repository.port";
import { Order } from "@exchange/domain/order.entity";
import { PaginatedOrderResponseDto } from "@exchange/dtos/order.dto";
import { PaginatedGroupedOrdersQuery } from "@exchange/queries/paginatedGroupedOrders/paginatedGroupedOrders.query";
import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Paginated } from "@shared/utils/database/repository.port";
import { PaginatedQueryRequestDto } from "@shared/utils/dtos/paginated-query.request.dto";

@Controller("v1/")
@ApiTags("Pedidos Agrupados por preço")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PaginatedGroupedOrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("orders/grouped")
  @ApiOperation({ summary: "Listar Pedidos Agrupados por preço" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PaginatedOrderResponseDto,
  })
  async paginatedOrders(
    @Query() queryParams: PaginatedQueryRequestDto & GroupedOrderQuery,
  ): Promise<PaginatedOrderResponseDto> {
    return this.queryBus
      .execute<
        PaginatedGroupedOrdersQuery,
        Paginated<Order>
      >(new PaginatedGroupedOrdersQuery(queryParams))
      .then((result) => new PaginatedOrderResponseDto(result));
  }
}
