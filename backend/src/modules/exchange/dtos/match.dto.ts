import { ApiProperty } from "@nestjs/swagger";
import { Decimal, decimalApiProperty } from "@shared/utils/domain/decimal";
import { BaseEntityDto } from "@shared/utils/dtos/baseEntity.dto";
import { PaginatedResponseDto } from "@shared/utils/dtos/paginated.response.base";

export class MatchDto extends BaseEntityDto {
  @ApiProperty(decimalApiProperty("preço da ordem", "30000.5"))
  price!: Decimal;

  @ApiProperty(decimalApiProperty("quantidade da ordem", "15000.25"))
  volume!: Decimal;

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
  @ApiProperty(decimalApiProperty("Volume de BTC em 24h", "1.5"))
  btcVolume24h!: Decimal;
  @ApiProperty(decimalApiProperty("Volume de USD em 24h", "45000.75"))
  usdVolume24h!: Decimal;
  @ApiProperty({
    ...decimalApiProperty("Ultimo preço", "30000.5"),
    nullable: true,
  })
  lastPrice!: Decimal | null;
  @ApiProperty({
    ...decimalApiProperty("Maior preço em 24h", "31000"),
    nullable: true,
  })
  high24h!: Decimal | null;
  @ApiProperty({
    ...decimalApiProperty("Menor preço em 24h", "29000"),
    nullable: true,
  })
  low24h!: Decimal | null;
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
