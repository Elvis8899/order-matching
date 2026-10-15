import { DecimalType } from "@shared/utils/domain/decimal";
import { z } from "zod";

export const WALLET_CREATED = "wallet.created";

export const WalletCreatedEvent = z.object({
  eventKey: z.literal(WALLET_CREATED),
  payload: z.object({
    id: z.string(),
    btc: DecimalType,
    usd: DecimalType,
  }),
});

export type WalletCreatedEvent = z.infer<typeof WalletCreatedEvent>;
