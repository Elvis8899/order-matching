import { AuthenticatedRequest } from "@auth/domain/login.entity";
import { AuthGuard } from "@auth/guards/auth.guard";
import { WalletDto } from "@exchange/dtos/wallet.dto";
import { GetWalletByIdQuery } from "@exchange/queries/getWalletById/getWalletById.query";
import {
  Controller,
  Get,
  HttpStatus,
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

@Controller("v1/")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiTags("Carteira")
export class GetWalletByIdController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get("wallet")
  @ApiOperation({ summary: "Encontrar uma carteira pelo ID" })
  @ApiNotFoundResponse({ description: "Carteira não encontrada." })
  @ApiResponse({
    status: HttpStatus.OK,
    type: WalletDto,
  })
  async paginatedWallets(
    @Request() req: AuthenticatedRequest,
  ): Promise<WalletDto> {
    const id = req.user.sub;

    return this.queryBus
      .execute<GetWalletByIdQuery, WalletDto>(new GetWalletByIdQuery(id))
      .then((result) => result);
  }
}
