import { ApiProperty, PickType } from "@nestjs/swagger";
import { UserDto } from "@user/dtos/user.dto";

class AuthUserDto extends PickType(UserDto, ["id", "username"] as const) {}

export class AuthResponseDto {
  @ApiProperty({
    description: "Token de acesso",
    required: true,
  })
  accessToken!: string;
  @ApiProperty({
    description: "Token de atualização",
    required: true,
  })
  refreshToken!: string;

  @ApiProperty({
    description: "Usuário",
    required: true,
  })
  user!: AuthUserDto;
}
