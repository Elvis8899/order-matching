import { UnauthorizedException } from "@nestjs/common";

export class WrongAuthException extends UnauthorizedException {
  constructor() {
    super("O email e/ou senha estão incorretos.");
  }
}

export const wrongAuthException = () => new WrongAuthException();
