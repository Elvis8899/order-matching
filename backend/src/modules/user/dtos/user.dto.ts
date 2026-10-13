import { ApiProperty, OmitType, PickType } from "@nestjs/swagger";
import { BaseEntityDto } from "@shared/utils/dtos/baseEntity.dto";
import { PaginatedResponseDto } from "@shared/utils/dtos/paginated.response.base";
import { User, UserRoleEnum } from "@user/domain/user.entity";

export class UserDto extends BaseEntityDto {
  @ApiProperty({
    description: "Nome do Usuario",
    required: true,
  })
  username!: string;
  @ApiProperty({
    description: "Senha do Usuario (8 a 72 caracteres)",
    required: true,
  })
  password!: string;
  @ApiProperty({
    description: "Papel do Usuario",
    required: true,
    enum: UserRoleEnum,
    default: UserRoleEnum.Client,
  })
  role!: UserRoleEnum;
}

// Sign up: new users are always clients
export class CreateUserDto extends PickType(UserDto, [
  "username",
  "password",
] as const) {}

// The password is kept when left out. Only admins may change the role.
export class UpdateUserDto extends PickType(UserDto, ["username"] as const) {
  @ApiProperty({
    description: "Nova senha do Usuario. Mantém a atual se omitida",
    required: false,
  })
  password?: string;
  @ApiProperty({
    description: "Papel do Usuario. Apenas administradores podem alterá-lo",
    required: false,
    enum: UserRoleEnum,
  })
  role?: UserRoleEnum;
}

export class UserResponseDto extends OmitType(UserDto, ["password"] as const) {}

// Every user response goes through here, so the password hash and the
// token version are never returned
export const toUserResponse = ({
  password: _password,
  tokenVersion: _tokenVersion,
  ...user
}: User): UserResponseDto => user;

export class PaginatedUserResponseDto extends PaginatedResponseDto<UserResponseDto> {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  data!: UserResponseDto[];
}
