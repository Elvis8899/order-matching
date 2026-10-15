import {
  Settlement,
  SettlementRepository,
} from "@exchange/database/settlement.repository.port";
import { orderChangedException } from "@exchange/domain/exchange.errors";
import { OrderStatusEnum } from "@exchange/domain/order.entity";
import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/adapter/prisma.service";
import { TE } from "@shared/utils/application/monads";
import { unknownException } from "@shared/utils/domain/shared.errors";

@Injectable()
export class RealSettlementRepository implements SettlementRepository {
  constructor(private prisma: PrismaService) {}

  private transactionErrorException = (error: unknown): Error =>
    error instanceof HttpException ? error : unknownException(error);

  settle = ({
    orders,
    wallets,
    matches,
  }: Settlement): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      () =>
        this.prisma.$transaction(async (tx) => {
          // Conditional updates lock the rows, so an order cancelled or
          // filled meanwhile rolls the whole settlement back
          for (const { order, readFilled } of orders) {
            const { count } = await tx.order.updateMany({
              where: {
                id: order.id,
                status: OrderStatusEnum.Active,
                filled: readFilled,
              },
              data: { filled: order.filled, status: order.status },
            });
            if (count === 0) throw orderChangedException();
          }
          for (const wallet of wallets) {
            await tx.wallet.upsert({
              where: { id: wallet.id },
              update: {
                btc: { increment: wallet.btc },
                usd: { increment: wallet.usd },
              },
              create: wallet,
            });
          }
          await tx.match.createMany({ data: matches });
        }),
      this.transactionErrorException,
    );
}
