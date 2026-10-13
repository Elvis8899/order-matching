import { LoginCommand } from "@auth/commands/login/login.command";
import { AuthResponseDto } from "@auth/dtos/authResponse.dto";
import { LoginDto } from "@auth/dtos/login.dto";
import { LoginThrottlerGuard } from "@auth/guards/loginThrottler.guard";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
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
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({ summary: "Login a user" })
  @ApiOkResponse({
    description:
      "Authenticates a user with username and password and returns tokens",
  })
  @ApiUnauthorizedResponse({ description: "Forbidden" })
  @ApiTooManyRequestsResponse({
    description: "Muitas tentativas de login para este usuário.",
  })
  public async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.commandBus.execute<LoginCommand, AuthResponseDto>(
      new LoginCommand(loginDto),
    );
  }
}
