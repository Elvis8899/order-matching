import { CreateWallet } from "@exchange/commands/createWallet/createWallet.command";
import { Injectable } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";
import {
  USER_CREATED,
  UserCreatedEvent,
} from "@user/domain/events/userCreated.event";

@Injectable()
export class CreateUserSubscriber {
  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(USER_CREATED)
  async afterUserCreatedEvent(
    payload: UserCreatedEvent["payload"],
  ): Promise<void> {
    const command = new CreateWallet({ id: payload.id, btc: 100, usd: 100000 });
    return this.commandBus.execute(command);
  }
}
