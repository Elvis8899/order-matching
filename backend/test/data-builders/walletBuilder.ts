import { Wallet } from "@exchange/domain/wallet.entity";
import { CreateWalletDto } from "@exchange/dtos/wallet.dto";
import { FPF } from "@shared/utils/application/monads";
import { UUID } from "@shared/uuid/entities/uuid";
import { BuilderPort } from "@test/util/builder.port";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { z } from "zod";

export class WalletBuilder extends BuilderPort<z.input<typeof Wallet>> {
  protected override defaultProperties = {
    id: UUID.parse(createTestId(TableNameEnum.Wallet, 0)),
    usd: 100000,
    btc: 100,
  };
  constructor(index?: number) {
    super();
    if (index) {
      this.defaultProperties.id = createTestId(TableNameEnum.User, index);
    }
    this.overrides = {
      ...this.defaultProperties,
    };
  }

  withId(id: string) {
    this.overrides.id = id;
    return this;
  }

  build(): Wallet {
    return Wallet.parse({
      ...this.defaultProperties,
      ...this.overrides,
    });
  }

  buildCreateDTO(): CreateWalletDto {
    const user = {
      ...this.defaultProperties,
      ...this.overrides,
    };

    return FPF.unsafeCoerce({
      ...user,
    });
  }
}
