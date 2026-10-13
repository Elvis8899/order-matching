import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { noop } from "@shared/utils/application/noop";
import { CreateUser } from "@user/commands/createUser/createUser.command";
import { CreateUserDto } from "@user/dtos/user.dto";

@Controller("v1/")
@ApiTags("Usuários")
export class CreateUserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post("users")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Cria um Usuário.",
    description: `Cadastro público. O usuário criado é sempre um cliente.`,
  })
  @ApiCreatedResponse({ description: "Usuário criado com sucesso." })
  @ApiUnprocessableEntityResponse({ description: "Usuário inválido." })
  @ApiConflictResponse({ description: "Usuário já existe." })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<void> {
    return this.commandBus
      .execute<CreateUser>(new CreateUser(createUserDto))
      .then(noop);
  }
}
