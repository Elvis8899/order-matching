import {
  CreateWallet,
  CreateWalletHandler,
} from "@exchange/commands/createWallet/createWallet.command";
import { FakeWalletRepository } from "@exchange/database/fakeWallet.repository";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { WalletAlreadyExistsException } from "@exchange/domain/exchange.errors";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domainEventPublisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";

//Adapters

describe("[Unit] Create Wallet", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        CreateWalletHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
        { provide: WalletRepository, useClass: FakeWalletRepository },
      ],
    },
    (ref) => ({
      walletRepository: ref.get(WalletRepository),
      userRepository: ref.get(UserRepository),
      createWalletHandler: ref.get(CreateWalletHandler),
      eventPublisher: ref.get(DomainEventPublisher),
    }),
  );

  const defaultUser = new UserBuilder().build();
  beforeEach(async () => {
    await modRef.init();

    await executeTask(modRef.r.userRepository.save(defaultUser));
  });

  it("Should create wallet if wallet is valid", async () => {
    // Given a potentially valid wallet
    const wallet = new WalletBuilder().buildCreateDTO();

    // When we create a wallet
    const resultPromise = modRef.r.createWalletHandler.execute(
      new CreateWallet(wallet),
    );

    // Then it should have created a wallet
    await expect(resultPromise).resolves.toEqual(undefined);

    const wallets = await executeTask(modRef.r.walletRepository.findAll());
    expect(wallets.length).toEqual(1);
  });

  it("Should emit domain event when wallet is created", async () => {
    //Given a potentially valid name

    const spy = jest.spyOn(modRef.r.eventPublisher, "publishEvent");

    const wallet = new WalletBuilder().buildCreateDTO();
    //When we create a wallet
    await modRef.r.createWalletHandler.execute(new CreateWallet(wallet));

    //Then it should have created a wallet and emitted an event
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("Should not create wallet if wallet already exists", async () => {
    // Given a potentially valid wallet
    const walletBuilder = new WalletBuilder();
    const wallet = walletBuilder.buildCreateDTO();
    // And an existing wallet in database
    await executeTask(modRef.r.walletRepository.save(walletBuilder.build()));

    // When we create a wallet
    const resultPromise = modRef.r.createWalletHandler.execute(
      new CreateWallet(wallet),
    );

    // Then it should have created a wallet
    await expect(resultPromise).rejects.toBeInstanceOf(
      WalletAlreadyExistsException,
    );

    const wallets = await executeTask(modRef.r.walletRepository.findAll());
    expect(wallets.length).toEqual(1);
  });
});
