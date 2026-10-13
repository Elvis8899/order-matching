import { FakeWalletRepository } from "@exchange/database/fakeWallet.repository";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { WalletNotFoundException } from "@exchange/domain/exchange.errors";
import {
  GetWalletByIdQuery,
  GetWalletByIdQueryHandler,
} from "@exchange/queries/getWalletById/getWalletById.query";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { WalletBuilder } from "@test/data-builders/walletBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";

describe("[Unit] Get Wallet By Id", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        GetWalletByIdQueryHandler,
        { provide: WalletRepository, useClass: FakeWalletRepository },
      ],
    },
    (ref) => ({
      walletRepository: ref.get(WalletRepository),
      getWalletByIdQueryHandler: ref.get(GetWalletByIdQueryHandler),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should get wallet if he exists", async () => {
    //Given a valid query
    const wallet = new WalletBuilder().build();

    const query = new GetWalletByIdQuery(wallet.id);

    //With wallets in database
    await executeTask(modRef.r.walletRepository.save(wallet));

    //When we get wallet id
    const result = await modRef.r.getWalletByIdQueryHandler.execute(query);
    //Then it should show his data
    expect(result.id).toBe(wallet.id);
  });

  it("Shouldnt get wallet if id is invalid", async () => {
    //Given a valid query
    const query = new GetWalletByIdQuery(createTestId(TableNameEnum.Wallet, 0));

    //With wallets in database
    const wallet = new WalletBuilder(1).build();
    await executeTask(modRef.r.walletRepository.save(wallet));

    //When get wallet
    const resultPromise = modRef.r.getWalletByIdQueryHandler.execute(query);
    //Then it should show a list of wallets

    await expect(resultPromise).rejects.toBeInstanceOf(WalletNotFoundException);
  });

  it("Shouldnt get wallet if there isnt wallets", async () => {
    //Given a valid query and no wallets in database

    const wallet = new WalletBuilder(1).build();
    const query = new GetWalletByIdQuery(wallet.id);

    //When we list wallets
    const resultPromise = modRef.r.getWalletByIdQueryHandler.execute(query);
    //Then it should throw an WalletNotFoundException
    await expect(resultPromise).rejects.toBeInstanceOf(WalletNotFoundException);
  });
});
