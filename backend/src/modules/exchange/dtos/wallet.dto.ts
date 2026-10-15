import { ApiProperty, OmitType } from "@nestjs/swagger";
import {
  Decimal,
  decimalApiProperty,
  DecimalInput,
} from "@shared/utils/domain/decimal";
import { BaseEntityDto } from "@shared/utils/dtos/baseEntity.dto";
import { PaginatedResponseDto } from "@shared/utils/dtos/paginated.response.base";

export class WalletDto extends BaseEntityDto {
  @ApiProperty(decimalApiProperty("Quantidade de BTC", "1.5"))
  btc!: Decimal;

  @ApiProperty(decimalApiProperty("Status de USD", "100000"))
  usd!: Decimal;
}

export class CreateWalletDto extends OmitType(WalletDto, [
  "btc",
  "usd",
  "createdAt",
  "updatedAt",
]) {
  @ApiProperty(decimalApiProperty("Quantidade de BTC", "1.5"))
  btc!: DecimalInput;
  @ApiProperty(decimalApiProperty("Quantidade de USD", "100000"))
  usd!: DecimalInput;
}

export class PaginatedWalletResponseDto extends PaginatedResponseDto<WalletDto> {
  @ApiProperty({ type: WalletDto, isArray: true })
  data!: WalletDto[];
}
