import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@Controller("check")
@ApiTags("Padrão")
export class AppController {
  @Get("status")
  serverStatus() {
    return "ok";
  }
}
