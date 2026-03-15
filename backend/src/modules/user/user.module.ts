import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { CreateUserHandler } from "@user/commands/createUser/createUser.command";
import { CreateUserController } from "@user/commands/createUser/createUser.controller";
import { DeleteUserHandler } from "@user/commands/deleteUser/deleteUser.command";
import { DeleteUserController } from "@user/commands/deleteUser/deleteUser.controller";
import { UpdateUserHandler } from "@user/commands/updateUser/updateUser.command";
import { UpdateUserController } from "@user/commands/updateUser/updateUser.controller";
import { RealUserRepository } from "@user/database/realUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { GetUserByIdController } from "@user/queries/getUserById/getUserById.controller";
import { GetUserByIdQueryHandler } from "@user/queries/getUserById/getUserById.query";
import { PaginatedUserController } from "@user/queries/paginatedUsers/paginatedUsers.controller";
import { PaginatedUsersQueryHandler } from "@user/queries/paginatedUsers/paginatedUsers.query";

const controllers = [
  CreateUserController,
  UpdateUserController,
  DeleteUserController,
  PaginatedUserController,
  GetUserByIdController,
];
const commandHandlers = [
  CreateUserHandler,
  UpdateUserHandler,
  DeleteUserHandler,
];
const queryHandlers = [PaginatedUsersQueryHandler, GetUserByIdQueryHandler];
const services = [RealUUIDGeneratorService];
const repositories = [
  {
    provide: UserRepository,
    useClass: RealUserRepository,
  },
];

@Module({
  imports: [CqrsModule],
  controllers: [...controllers],
  providers: [
    //...controllers,
    ...commandHandlers,
    ...queryHandlers,
    ...services,
    ...repositories,
    // ...subscribers,
  ],
})
export class UserModule {}
