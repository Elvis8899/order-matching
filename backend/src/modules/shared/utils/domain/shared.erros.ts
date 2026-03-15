import { InternalServerErrorException } from "@nestjs/common";

export function unknownException(error: unknown): Error {
  return new InternalServerErrorException(error);
}
