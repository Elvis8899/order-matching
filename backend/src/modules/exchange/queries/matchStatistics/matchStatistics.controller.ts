import { Controller, Get, HttpStatus, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "@src/modules/auth/guards/auth.guard";
import { MatchStatisticsDto } from "@src/modules/exchange/dtos/match.dto";
import { MatchStatisticsQuery } from "@src/modules/exchange/queries/matchStatistics/matchStatistics.query";

@Controller("v1/")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags("Carteira")
export class MatchStatisticsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("match/statistics")
  @ApiOperation({ summary: "Retorna as estatísticas globais" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: MatchStatisticsDto,
  })
  async paginatedWallets(): Promise<MatchStatisticsDto> {
    return this.queryBus
      .execute<
        MatchStatisticsQuery,
        MatchStatisticsDto
      >(new MatchStatisticsQuery())
      .then((result) => result);
  }
}
