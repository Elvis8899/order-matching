import { ApiProperty, OmitType } from "@nestjs/swagger";
import { BaseEntityDto } from "@shared/utils/dtos/baseEntity.dto";
import { PaginatedResponseDto } from "@shared/utils/dtos/paginated.response.base";

export class UserDto extends BaseEntityDto {
  @ApiProperty({
    description: "Nome do Usuario",
    required: true,
  })
  username!: string;
}

export class CreateUserDto extends OmitType(UserDto, [
  "id",
  "createdAt",
  "updatedAt",
]) {}

export class PaginatedUserResponseDto extends PaginatedResponseDto<UserDto> {
  @ApiProperty({ type: UserDto, isArray: true })
  data!: UserDto[];
}
