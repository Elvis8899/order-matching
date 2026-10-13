import { AuthenticatedRequest } from "@auth/domain/login.entity";
import { AuthGuard } from "@auth/guards/auth.guard";
import { CreateOrder } from "@exchange/commands/createOrder/createOrder.command";
import { CreateOrderDto } from "@exchange/dtos/order.dto";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { noop } from "@shared/utils/application/noop";

@Controller("v1/")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags("Pedidos")
export class CreateOrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post("orders")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Cria um Pedido.",
    description: `Dado um Pedido válido, ele será criado.`,
  })
  @ApiCreatedResponse({ description: "Pedido criado com sucesso." })
  @ApiUnprocessableEntityResponse({ description: "Pedido inválido." })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    createOrderDto.userId = req.user.sub;
    return this.commandBus
      .execute<CreateOrder>(new CreateOrder(createOrderDto))
      .then(noop);
  }
}
