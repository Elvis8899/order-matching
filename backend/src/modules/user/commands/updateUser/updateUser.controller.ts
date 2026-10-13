import { AuthenticatedRequest, toRequester } from "@auth/domain/login.entity";
import { AuthGuard } from "@auth/guards/auth.guard";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { noop } from "@shared/utils/application/noop";
import { UpdateUser } from "@user/commands/updateUser/updateUser.command";
import { UpdateUserDto } from "@user/dtos/user.dto";

@Controller("v1/")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags("Usuários")
export class UpdateUserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Put("users/:id")
  @HttpCode(HttpStatus.OK)
  @ApiCreatedResponse({ description: "Usuário atualizado com sucesso." })
  @ApiUnprocessableEntityResponse({ description: "Usuário inválido." })
  @ApiNotFoundResponse({ description: "Usuário não encontrado." })
  @ApiForbiddenResponse({
    description: "Apenas administradores podem alterar o papel.",
  })
  @ApiOperation({
    summary: "Atualizar Usuário",
    description:
      "Clientes só podem atualizar a própria conta. Revoga os tokens de atualização do usuário.",
  })
  async updateUser(
    @Body() updateUserDto: UpdateUserDto,
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.commandBus
      .execute(new UpdateUser(updateUserDto, id, toRequester(req.user)))
      .then(noop);
  }
}
