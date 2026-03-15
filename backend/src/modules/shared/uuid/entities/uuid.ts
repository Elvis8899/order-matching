import { z } from "zod";

export const UUID = z.guid();
export type UUID = z.infer<typeof UUID>;
