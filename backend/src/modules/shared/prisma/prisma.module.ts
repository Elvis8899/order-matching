import { Global, Module } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
