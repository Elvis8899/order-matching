import { Injectable } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";
import { CreateWallet } from "@src/modules/exchange/commands/createWallet/createWallet.command";
import {
  USER_CREATED,
  UserCreatedEvent,
} from "@src/modules/user/domain/events/userCreated.event";

@Injectable()
export class UserCreatedSubscriber {
  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(USER_CREATED)
  async afterUserCreatedEvent(
    payload: UserCreatedEvent["payload"],
  ): Promise<void> {
    const command = new CreateWallet({ id: payload.id, btc: 100, usd: 100000 });
    return this.commandBus.execute(command);
  }
}
