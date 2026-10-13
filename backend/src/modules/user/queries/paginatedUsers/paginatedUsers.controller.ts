import { Roles } from "@auth/decorators/roles.decorator";
import { AuthGuard } from "@auth/guards/auth.guard";
import { RolesGuard } from "@auth/guards/roles.guard";
import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Paginated } from "@shared/utils/database/repository.port";
import { PaginatedQueryRequestDto } from "@shared/utils/dtos/paginatedQuery.request.dto";
import { User, UserRoleEnum } from "@user/domain/user.entity";
import { PaginatedUserResponseDto, toUserResponse } from "@user/dtos/user.dto";
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
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.Admin)
  @ApiOperation({ summary: "Listar Usuários" })
  @ApiForbiddenResponse({ description: "Apenas administradores." })
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
      .then(
        (result) =>
          new PaginatedUserResponseDto({
            count: result.count,
            limit: result.limit,
            page: result.page,
            data: result.data.map(toUserResponse),
          }),
      );
  }
}
