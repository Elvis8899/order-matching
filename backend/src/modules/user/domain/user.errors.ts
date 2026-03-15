import { ConflictException, NotFoundException } from "@nestjs/common";

export class UserCPFAlreadyExistsException extends ConflictException {
  constructor() {
    super("O CPF informado já está sendo utilizado por outro usuário.");
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super("Usuário não encontrado.");
  }
}

export const userCPFAlreadyExistsException = () =>
  new UserCPFAlreadyExistsException();

export const userNotFoundException = () => new UserNotFoundException();

export class UserEmailAlreadyExistsException extends ConflictException {
  constructor() {
    super("O Email informado já está sendo utilizado por outro usuário.");
  }
}

export const userEmailAlreadyExistsException = () =>
  new UserEmailAlreadyExistsException();

export class InsufficientWalletFundsException extends NotFoundException {
  constructor() {
    super("Saldo insuficiente.");
  }
}
export const insufficientWalletFundsException = () =>
  new InsufficientWalletFundsException();
