import { UnauthorizedException } from "@nestjs/common";

export class WrongAuthException extends UnauthorizedException {
  constructor() {
    super("O usuário e/ou senha estão incorretos.");
  }
}

export const wrongAuthException = () => new WrongAuthException();

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super("Sessão expirada. Faça login novamente.");
  }
}

export const invalidRefreshTokenException = () =>
  new InvalidRefreshTokenException();
