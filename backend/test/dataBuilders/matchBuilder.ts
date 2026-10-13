import { Match } from "@exchange/domain/match.entity";
import { UUID } from "@shared/uuid/entities/uuid";
import { BuilderPort } from "@test/util/builder.port";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { z } from "zod";

export class MatchBuilder extends BuilderPort<z.input<typeof Match>> {
  protected override defaultProperties = {
    id: UUID.parse(createTestId(TableNameEnum.Match, 0)),
    price: 100,
    volume: 100,
    buyOrderId: UUID.parse(createTestId(TableNameEnum.Order, 0)),
    sellOrderId: UUID.parse(createTestId(TableNameEnum.Order, 1)),
    buyUserId: UUID.parse(createTestId(TableNameEnum.User, 0)),
    sellUserId: UUID.parse(createTestId(TableNameEnum.User, 1)),
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

  build(): Match {
    return Match.parse({
      ...this.defaultProperties,
      ...this.overrides,
    });
  }
}
