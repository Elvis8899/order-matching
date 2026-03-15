import { AuthGuard } from "@auth/guards/auth.guard";
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
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
import { DeleteUser } from "@user/commands/deleteUser/deleteUser.command";

@Controller("v1/")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags("Usuários")
export class DeleteUserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Delete("users/:id")
  @HttpCode(HttpStatus.OK)
  @ApiNotFoundResponse({ description: "Usuário não encontrado." })
  @ApiUnprocessableEntityResponse({ description: "Id inválido." })
  @ApiDefaultResponse({ description: "Usuário excluído com sucesso." })
  @ApiOperation({ summary: "Deletar Usuário" })
  async deleteUser(@Param("id") userId: string): Promise<void> {
    return this.commandBus
      .execute<DeleteUser>(new DeleteUser(userId))
      .then(noop);
  }
}
