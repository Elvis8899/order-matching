import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { Wallet } from "@exchange/domain/wallet.entity";
import { Injectable } from "@nestjs/common";
import { validateFromUnknown } from "@shared/utils/application/validateWith";
import { FakeRepository } from "@shared/utils/database/fakeRepository.base";

@Injectable()
export class FakeWalletRepository
  extends FakeRepository<Wallet>
  implements WalletRepository
{
  protected readonly validate = validateFromUnknown(Wallet, "Wallet");

  /** Saved amounts are deltas: they add to the stored balance. */
  protected merge(stored: Wallet, update: Partial<Wallet>): Wallet {
    return {
      ...stored,
      btc: stored.btc.add(update.btc ?? 0),
      usd: stored.usd.add(update.usd ?? 0),
      updatedAt: new Date(),
    };
  }
}
