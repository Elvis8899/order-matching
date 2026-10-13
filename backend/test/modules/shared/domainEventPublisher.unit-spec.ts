import { InternalServerErrorException } from "@nestjs/common";
import { DomainEventPublisher } from "@shared/domainEventPublisher/adapters/domainEventPublisher";
import { executeTask } from "@shared/utils/application/executeTask";
import { USER_CREATED } from "@user/domain/events/userCreated.event";
import { unsafeCoerce } from "fp-ts/lib/function";

const eventEmitter2Mock = {
  emit: jest.fn(() => true),
};
const domainEvent = new DomainEventPublisher(unsafeCoerce(eventEmitter2Mock));
beforeEach(() => {
  eventEmitter2Mock.emit.mockClear();
});

describe("[Unit] DomainEventPublisher", () => {
  it("should be defined", () => {
    expect(domainEvent).toBeDefined();
  });

  it("should emit event", async () => {
    await executeTask(
      domainEvent.publishEvent({
        eventKey: USER_CREATED,
        payload: {
          id: "id",
          username: "name",
        },
      }),
    );
    expect(eventEmitter2Mock.emit).toHaveBeenCalled();
  });

  it("If emit fails, should get error", async () => {
    eventEmitter2Mock.emit.mockImplementationOnce(() => {
      throw new Error();
    });
    await expect(
      executeTask(
        domainEvent.publishEvent({
          eventKey: USER_CREATED,
          payload: {
            id: "id",
            username: "name",
          },
        }),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
