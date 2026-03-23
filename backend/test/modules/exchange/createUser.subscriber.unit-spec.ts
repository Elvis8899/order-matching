import { CqrsModule } from "@nestjs/cqrs";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";
import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { CreateWalletHandler } from "@src/modules/exchange/commands/createWallet/createWallet.command";
import { FakeWalletRepository } from "@src/modules/exchange/database/fakeWallet.repository";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import { CreateUserSubscriber } from "@src/modules/exchange/subscribers/createUser.subscriber";
import { FakeUserRepository } from "@src/modules/user/database/fakeUser.repository";
import { UserRepository } from "@src/modules/user/database/user.repository.port";
import {
  USER_CREATED,
  UserCreatedEvent,
} from "@src/modules/user/domain/events/userCreated.event";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";

describe("[Unit] Endpoint Response - Subscriber", () => {
  const modRef = new UnitModule(
    {
      imports: [CqrsModule, DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        CreateWalletHandler,
        CreateUserSubscriber,
        { provide: UserRepository, useClass: FakeUserRepository },
        { provide: WalletRepository, useClass: FakeWalletRepository },
      ],
    },
    (ref) => ({
      walletRepository: ref.get(WalletRepository),
      userRepository: ref.get(UserRepository),
      eventPublisher: ref.get(DomainEventPublisher),
      createUserSubscriber: ref.get(CreateUserSubscriber),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should not return error", async () => {
    // Given a valid saved user
    const user = new UserBuilder().build();
    await executeTask(modRef.r.userRepository.save(user));

    // And a valid event
    const responseWatcherEvent = UserCreatedEvent.parse({
      eventKey: USER_CREATED,
      payload: {
        id: user.id,
        username: user.username,
      },
    });
    //When the function is called
    const resultPromise = modRef.r.createUserSubscriber.afterUserCreatedEvent(
      responseWatcherEvent.payload,
    );

    //Then it should resolve to undefined
    await expect(resultPromise).resolves.toBe(undefined);
    // and  should have created a wallet
    const wallets = await executeTask(modRef.r.walletRepository.findAll());
    expect(wallets.length).toEqual(1);
  });
});
