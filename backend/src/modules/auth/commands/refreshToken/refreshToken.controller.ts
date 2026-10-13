import { RefreshTokenCommand } from "@auth/commands/refreshToken/refreshToken.command";
import { AuthResponseDto } from "@auth/dtos/authResponse.dto";
import { RefreshTokenDto } from "@auth/dtos/refreshToken.dto";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

@Controller("v1/")
@ApiTags("Login")
export class RefreshTokenController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renovar tokens de acesso" })
  @ApiOkResponse({
    description: "Retorna novos tokens a partir de um token de atualização",
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Token de atualização inválido." })
  public async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.commandBus.execute<RefreshTokenCommand, AuthResponseDto>(
      new RefreshTokenCommand(refreshTokenDto),
    );
  }
}
