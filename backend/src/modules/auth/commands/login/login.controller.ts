import { LoginCommand } from "@auth/commands/login/login.command";
import { AuthResponseDto } from "@auth/dtos/authResponse.dto";
import { LoginDto } from "@auth/dtos/login.dto";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

@Controller("v1/")
@ApiTags("Login")
export class LoginController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login a user" })
  @ApiOkResponse({
    description:
      "Authentication a user with email and password credentials and return token",
  })
  @ApiUnauthorizedResponse({ description: "Forbidden" })
  public async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.commandBus.execute<LoginCommand, AuthResponseDto>(
      new LoginCommand(loginDto),
    );
  }
}
