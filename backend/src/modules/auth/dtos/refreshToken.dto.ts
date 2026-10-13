import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({
    description: "Token de atualização recebido no login",
    required: true,
  })
  refreshToken!: string;
}
