import { AuthGuard } from "@auth/guards/auth.guard";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { noop } from "@shared/utils/application/noop";
import { UpdateUser } from "@user/commands/updateUser/updateUser.command";
import { CreateUserDto } from "@user/dtos/user.dto";

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
  @ApiOperation({ summary: "Atualizar Usuário" })
  async updateUser(
    @Body() updateModuleDto: CreateUserDto,
    @Param("id") id: string,
  ): Promise<void> {
    return this.commandBus
      .execute(new UpdateUser(updateModuleDto, id))
      .then(noop);
  }
}
