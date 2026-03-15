import { CommandHandler, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { fromInputRE } from "@shared/utils/application/fromInput";
import { FPF, RE, RTE } from "@shared/utils/application/monads";
import { noop } from "@shared/utils/application/noop";
import { performRTE } from "@shared/utils/application/perform";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import { WALLET_CREATED } from "@src/modules/exchange/domain/events/walletCreated.event";
import { Wallet } from "@src/modules/exchange/domain/wallet.entity";
import { CreateWalletDto } from "@src/modules/exchange/dtos/wallet.dto";
import { UserRepository } from "@src/modules/user/database/user.repository.port";
import { userNotFoundException } from "@src/modules/user/domain/user.errors";
import { PinoLogger } from "nestjs-pino";

export class CreateWallet implements ICommand {
  constructor(public readonly props: CreateWalletDto) {}
}

@CommandHandler(CreateWallet)
export class CreateWalletHandler implements ICommandHandler<
  CreateWallet,
  void
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("CreateWallet");
  }

  execute(command: CreateWallet): Promise<void> {
    this.logger.info(command.props, "CreateWallet command received");
    const task = FPF.pipe(
      //Data validation
      RE.of(command.props),

      RE.chain(fromInputRE(Wallet, "Wallet")),
      RTE.fromReaderEither,

      //Validate user exists
      RTE.tap(
        FPF.flow(
          (data) => data.id,
          performRTE(this.userRepository.findById, "get wallet by id"),
          RTE.chainW(RTE.fromOption<Error>(userNotFoundException)),
        ),
      ),

      // Store entity
      RTE.tap(
        performRTE(
          this.walletRepository.save,
          "save wallet in storage system.",
        ),
      ),

      // //Emit domain event
      RTE.chain((wallet) =>
        performRTE(
          this.domainEventPublisher.publishEvent,
          "emit wallet created event.",
        )({
          eventKey: WALLET_CREATED,
          payload: {
            id: wallet.id,
            usd: wallet.usd,
            btc: wallet.btc,
          },
        }),
      ),
      RTE.map(noop),
    )({ logger: this.logger });
    return executeTask(task);
  }
}
