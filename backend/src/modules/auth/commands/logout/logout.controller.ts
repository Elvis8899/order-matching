import { LogoutCommand } from "@auth/commands/logout/logout.command";
import { AuthenticatedRequest } from "@auth/domain/login.entity";
import { AuthGuard } from "@auth/guards/auth.guard";
import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { noop } from "@shared/utils/application/noop";

@Controller("v1/")
@ApiTags("Login")
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class LogoutController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Encerrar sessão",
    description:
      "Revoga todos os tokens de atualização do usuário. Tokens de acesso continuam válidos até expirar.",
  })
  @ApiNoContentResponse({ description: "Sessão encerrada." })
  @ApiUnauthorizedResponse({ description: "Token de acesso inválido." })
  public async logout(@Request() req: AuthenticatedRequest): Promise<void> {
    return this.commandBus.execute(new LogoutCommand(req.user.sub)).then(noop);
  }
}
