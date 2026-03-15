import { ApiProperty, OmitType } from "@nestjs/swagger";
import { BaseEntityDto } from "@shared/utils/dtos/baseEntity.dto";
import { PaginatedResponseDto } from "@shared/utils/dtos/paginated.response.base";

export class WalletDto extends BaseEntityDto {
  @ApiProperty({
    description: "Quantidade de BTC",
    required: true,
  })
  btc!: number;

  @ApiProperty({
    description: "Status de USD",
    required: true,
  })
  usd!: number;
}

export class CreateWalletDto extends OmitType(WalletDto, [
  // "id",
  "createdAt",
  "updatedAt",
]) {}

export class PaginatedWalletResponseDto extends PaginatedResponseDto<WalletDto> {
  @ApiProperty({ type: WalletDto, isArray: true })
  data!: WalletDto[];
}
