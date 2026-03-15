import { PickType } from "@nestjs/swagger";
import { UserDto } from "@user/dtos/user.dto";

export class LoginDto extends PickType(UserDto, ["username"] as const) {}
