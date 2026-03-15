import { ApiProperty } from "@nestjs/swagger";
import { BaseEntityDto } from "@shared/utils/dtos/baseEntity.dto";
import { PaginatedResponseDto } from "@shared/utils/dtos/paginated.response.base";

export class MatchDto extends BaseEntityDto {
  @ApiProperty({
    description: "preço da ordem",
    required: true,
  })
  price!: number;

  @ApiProperty({
    description: "quantidade da ordem",
    required: true,
  })
  volume!: number;

  @ApiProperty({
    description: "ID da ordem de compra",
    required: true,
  })
  buyOrderId!: string;

  @ApiProperty({
    description: "ID da ordem de venda",
    required: true,
  })
  sellOrderId!: string;

  @ApiProperty({
    description: "ID do usuário da ordem de compra",
    required: true,
  })
  buyUserId!: string;

  @ApiProperty({
    description: "ID do usuário da ordem de venda",
    required: true,
  })
  sellUserId!: string;
}

export class MatchStatisticsDto {
  @ApiProperty({
    description: "Volume de BTC em 24h",
    required: true,
  })
  btcVolume24h!: number;
  @ApiProperty({
    description: "Volume de USD em 24h",
    required: true,
  })
  usdVolume24h!: number;
  @ApiProperty({
    description: "Ultimo preço",
    required: false,
  })
  lastPrice!: number | null;
  @ApiProperty({
    description: "Maior preço em 24h",
    required: false,
  })
  high24h!: number | null;
  @ApiProperty({
    description: "Menor preço em 24h",
    required: false,
  })
  low24h!: number | null;
}

// export class CreateMatchDto extends OmitType(MatchDto, [
//   "id",
//   "createdAt",
//   "updatedAt",
// ]) {}

export class PaginatedMatchesResponseDto extends PaginatedResponseDto<MatchDto> {
  @ApiProperty({ type: MatchDto, isArray: true })
  data!: MatchDto[];
}
