import { AuthGuard } from "@auth/guards/auth.guard";
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiDefaultResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { noop } from "@shared/utils/application/noop";
import { AuthenticatedRequest } from "@src/modules/auth/domain/login.entity";
import { CancelOrder } from "@src/modules/exchange/commands/cancelOrder/cancelOrder.command";

@Controller("v1/")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags("Pedidos")
export class CancelOrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Delete("orders/:id")
  @HttpCode(HttpStatus.OK)
  @ApiNotFoundResponse({ description: "Usuário não encontrado." })
  @ApiUnprocessableEntityResponse({ description: "Id inválido." })
  @ApiDefaultResponse({ description: "Usuário excluído com sucesso." })
  @ApiOperation({ summary: "Deletar Usuário" })
  async deleteOrder(
    @Param("id") orderId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const id = req.user.sub;
    return this.commandBus
      .execute<CancelOrder>(new CancelOrder(orderId, id))
      .then(noop);
  }
}
