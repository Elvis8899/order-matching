import { AuthGuard } from "@auth/guards/auth.guard";
import { Order } from "@exchange/domain/order.entity";
import { PaginatedOrderResponseDto } from "@exchange/dtos/order.dto";
import { PaginatedOrdersQuery } from "@exchange/queries/paginatedOrders/paginatedOrders.query";
import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Paginated } from "@shared/utils/database/repository.port";
import { PaginatedQueryRequestDto } from "@shared/utils/dtos/paginatedQuery.request.dto";

@Controller("v1/")
@ApiTags("Pedidos")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PaginatedOrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("orders")
  @ApiOperation({ summary: "Listar Pedidos" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PaginatedOrderResponseDto,
  })
  async paginatedOrders(
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<PaginatedOrderResponseDto> {
    return this.queryBus
      .execute<
        PaginatedOrdersQuery,
        Paginated<Order>
      >(new PaginatedOrdersQuery(queryParams))
      .then((result) => new PaginatedOrderResponseDto(result));
  }
}
