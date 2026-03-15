import { FPF } from "@shared/utils/application/monads";
import { UserCreatedEvent } from "@user/domain/events/userCreated.event";
import { UserDeletedEvent } from "@user/domain/events/userDeleted.event";
import { UserUpdatedEvent } from "@user/domain/events/userUpdated.event";

export const AllUserEvents = FPF.tuple(
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
);
