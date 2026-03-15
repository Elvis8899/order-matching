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
import { Match } from "@src/modules/exchange/domain/match.entity";
import { PaginatedMatchesResponseDto } from "@src/modules/exchange/dtos/match.dto";
import { PaginatedMatchesQuery } from "@src/modules/exchange/queries/paginatedMatches/paginatedMatches.query";

@Controller("v1/")
@ApiTags("Usuários")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PaginatedMatchController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("matches")
  @ApiOperation({ summary: "Listar Vendas" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PaginatedMatchesResponseDto,
  })
  async paginatedMatchs(
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<PaginatedMatchesResponseDto> {
    return this.queryBus
      .execute<
        PaginatedMatchesQuery,
        Paginated<Match>
      >(new PaginatedMatchesQuery(queryParams))
      .then((result) => new PaginatedMatchesResponseDto(result));
  }
}
