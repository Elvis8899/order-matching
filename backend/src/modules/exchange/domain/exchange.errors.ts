import { NotFoundException } from "@nestjs/common";

export class WalletNotFoundException extends NotFoundException {
  constructor() {
    super("Carteira não encontrada.");
  }
}

export const walletNotFoundException = () => new WalletNotFoundException();

export class OrderNotFoundException extends NotFoundException {
  constructor() {
    super("Pedido não encontrado.");
  }
}

export const orderNotFoundException = () => new OrderNotFoundException();

export class InsufficientWalletFundsException extends NotFoundException {
  constructor() {
    super("Saldo insuficiente.");
  }
}
export const insufficientWalletFundsException = () =>
  new InsufficientWalletFundsException();
