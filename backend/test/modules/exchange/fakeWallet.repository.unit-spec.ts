import { FakeWalletRepository } from "@exchange/database/fakeWallet.repository";
import { executeTask } from "@shared/utils/application/executeTask";
import { O } from "@shared/utils/application/monads";
import { Decimal } from "@shared/utils/domain/decimal";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";

describe("[Unit] Fake wallet repository", () => {
  it("Should add saved amounts to the stored balance, one side at a time", async () => {
    const repository = new FakeWalletRepository();
    const wallet = new WalletBuilder().build();
    await executeTask(repository.save(wallet));

    await executeTask(
      repository.save({ id: wallet.id, usd: new Decimal("0.1") }),
    );
    await executeTask(
      repository.save({ id: wallet.id, btc: new Decimal("0.2") }),
    );

    const stored = await executeTask(repository.findById(wallet.id));
    expect(
      O.map((w: typeof wallet) => [w.usd.toString(), w.btc.toString()])(stored),
    ).toEqual(
      O.some([
        wallet.usd.add("0.1").toString(),
        wallet.btc.add("0.2").toString(),
      ]),
    );
  });
});
