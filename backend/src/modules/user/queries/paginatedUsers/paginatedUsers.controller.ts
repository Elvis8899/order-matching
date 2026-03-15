import { AuthGuard } from "@auth/guards/auth.guard";
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
import { User } from "@user/domain/user.entity";
import { PaginatedUserResponseDto } from "@user/dtos/user.dto";
import { PaginatedUsersQuery } from "@user/queries/paginatedUsers/paginatedUsers.query";

@Controller("v1/")
@ApiTags("Usuários")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PaginatedUserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("users")
  @ApiOperation({ summary: "Listar Usuários" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PaginatedUserResponseDto,
  })
  async paginatedUsers(
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<PaginatedUserResponseDto> {
    return this.queryBus
      .execute<
        PaginatedUsersQuery,
        Paginated<User>
      >(new PaginatedUsersQuery(queryParams))
      .then((result) => new PaginatedUserResponseDto(result));
  }
}
