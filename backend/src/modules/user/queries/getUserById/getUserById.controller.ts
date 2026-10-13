import { AuthenticatedRequest, toRequester } from "@auth/domain/login.entity";
import { AuthGuard } from "@auth/guards/auth.guard";
import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { User } from "@user/domain/user.entity";
import { toUserResponse, UserResponseDto } from "@user/dtos/user.dto";
import { GetUserByIdQuery } from "@user/queries/getUserById/getUserById.query";

@Controller("v1/")
@ApiTags("Usuários")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class GetUserByIdController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("users/:id")
  @ApiOperation({
    summary: "Encontrar um usuário pelo ID",
    description: "Clientes só podem consultar a própria conta.",
  })
  @ApiNotFoundResponse({ description: "Usuário não encontrado." })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UserResponseDto,
  })
  async getUserById(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.queryBus
      .execute<
        GetUserByIdQuery,
        User
      >(new GetUserByIdQuery(id, toRequester(req.user)))
      .then(toUserResponse);
  }
}
