import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { walletNotFoundException } from "@exchange/domain/exchange.errors";
import { Wallet } from "@exchange/domain/wallet.entity";
import { IQuery, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, RTE } from "@shared/utils/application/monads";
import { performRTE } from "@shared/utils/application/perform";
import { UUID } from "@shared/uuid/entities/uuid";
import { PinoLogger } from "nestjs-pino";

export class GetWalletByIdQuery implements IQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetWalletByIdQuery)
export class GetWalletByIdQueryHandler implements IQueryHandler<
  GetWalletByIdQuery,
  Wallet
> {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("GetWalletById");
  }

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(query: GetWalletByIdQuery): Promise<Wallet> {
    const task = FPF.pipe(
      query.id,
      fromInputRE(UUID, "GetWalletByIdQuery"),
      RTE.fromReaderEither,
      RTE.chain(
        performRTE(
          this.walletRepository.findById,
          "get wallet in storage system.",
        ),
      ),
      RTE.chainW(RTE.fromOption<Error>(walletNotFoundException)),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
