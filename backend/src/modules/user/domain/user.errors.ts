import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super("Usuário não encontrado.");
  }
}

export const userNotFoundException = () => new UserNotFoundException();

export class UsernameAlreadyExistsException extends ConflictException {
  constructor() {
    super("O Email informado já está sendo utilizado por outro usuário.");
  }
}

export const usernameAlreadyExistsException = () =>
  new UsernameAlreadyExistsException();

export class RoleChangeForbiddenException extends ForbiddenException {
  constructor() {
    super("Apenas administradores podem alterar o papel de um usuário.");
  }
}

export const roleChangeForbiddenException = () =>
  new RoleChangeForbiddenException();
