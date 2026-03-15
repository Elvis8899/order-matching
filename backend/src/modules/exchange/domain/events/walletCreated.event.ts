import { z } from "zod";

export const WALLET_CREATED = "wallet.created";

export const WalletCreatedEvent = z.object({
  eventKey: z.literal(WALLET_CREATED),
  payload: z.object({
    id: z.string(),
    btc: z.number(),
    usd: z.number(),
  }),
});

export type WalletCreatedEvent = z.infer<typeof WalletCreatedEvent>;
