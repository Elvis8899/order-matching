import { AuthGuard } from "@auth/guards/auth.guard";
import { Match } from "@exchange/domain/match.entity";
import { PaginatedMatchesResponseDto } from "@exchange/dtos/match.dto";
import { PaginatedMatchesQuery } from "@exchange/queries/paginatedMatches/paginatedMatches.query";
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

@Controller("v1/")
@ApiTags("Transações")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PaginatedMatchController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("matches")
  @ApiOperation({ summary: "Listar Transações" })
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
