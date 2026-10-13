import {
  FindMatch,
  FindMatchHandler,
} from "@exchange/commands/findMatch/findMatch.command";
import { CreatedOrderProcessor } from "@exchange/processors/createdOrder.processor";
import { getQueueToken } from "@nestjs/bullmq";
import { CommandHandler, CqrsModule, ICommandHandler } from "@nestjs/cqrs";
import { QueueNames } from "@shared/queue/queue.config";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { UnitModule } from "@test/util/defaultModule.unit";
import { Job } from "bullmq";
import { unsafeCoerce } from "fp-ts/lib/function";
import { PinoLogger } from "nestjs-pino";

const exampleQueueMock = { add: jest.fn() };

@CommandHandler(FindMatch)
class FakeFindMatchHandler implements ICommandHandler<FindMatch> {
  execute = jest.fn();
}

describe("[Unit] Endpoint Response - Subscriber", () => {
  const modRef = new UnitModule(
    {
      imports: [CqrsModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        CreatedOrderProcessor,
        { provide: FindMatchHandler, useClass: FakeFindMatchHandler },
        // { provide: OrderRepository, useClass: FakeOrderRepository },
        //{ provide: WalletRepository, useClass: FakeWalletRepository },
        {
          provide: getQueueToken(QueueNames.ORDER_QUEUE),
          useValue: exampleQueueMock,
        },
      ],
    },
    (ref) => ({
      //walletRepository: ref.get(WalletRepository),
      // orderRepository: ref.get(OrderRepository),
      //eventPublisher: ref.get(DomainEventPublisher),
      matchHandler: ref.get(FindMatchHandler),
      createdOrderProcessor: ref.get(CreatedOrderProcessor),
      infoSpy: jest.spyOn(ref.get(PinoLogger), "info"),
      warnSpy: jest.spyOn(ref.get(PinoLogger), "warn"),
      errorSpy: jest.spyOn(ref.get(PinoLogger), "error"),
    }),
  );

  // And a valid job
  const jobPartial: Partial<Job<{ id: string }>> = {
    id: createTestId(TableNameEnum.None, 0),
    data: { id: createTestId(TableNameEnum.Order, 0) },
    opts: { attempts: 1 },
    attemptsMade: 0,
    updateProgress: jest.fn(),
  };
  const defaultJob: Job<{ id: string }> = unsafeCoerce(jobPartial);

  beforeEach(async () => {
    await modRef.init();
    exampleQueueMock.add.mockClear();
  });

  it("Should not return error", async () => {
    //When the function is called
    const resultPromise = modRef.r.createdOrderProcessor.process(
      unsafeCoerce(defaultJob),
    );

    //Then it should resolve to undefined
    await expect(resultPromise).resolves.toMatchObject({ ok: true });

    //Then it should have emitted an event
    // eslint-disable-next-line @typescript-eslint/unbound-method -- Not called
    expect(modRef.r.matchHandler.execute).toHaveBeenCalledTimes(1);
    expect(jobPartial.updateProgress).toHaveBeenCalledTimes(2);
  });

  it("Info loggers should be called", () => {
    // When a function that triggers info is called
    modRef.r.createdOrderProcessor.onActive(defaultJob);
    modRef.r.createdOrderProcessor.onResumed();
    modRef.r.createdOrderProcessor.onDrained();
    // Then the info loggers should be called
    expect(modRef.r.infoSpy).toHaveBeenCalledTimes(3);
  });

  it("Warn loggers should be called", () => {
    // When a function that triggers warn is called
    modRef.r.createdOrderProcessor.onStalled(defaultJob);
    modRef.r.createdOrderProcessor.onPaused();
    // Then the info loggers should be called
    expect(modRef.r.warnSpy).toHaveBeenCalledTimes(2);
  });

  it("Error loggers should be called", () => {
    // When a function that triggers warn is called
    modRef.r.createdOrderProcessor.onFailed(defaultJob, new Error());
    modRef.r.createdOrderProcessor.onFailed(undefined, new Error());
    // Then the info loggers should be called
    expect(modRef.r.errorSpy).toHaveBeenCalledTimes(2);
  });

  it("Get job id should return the job id", () => {
    expect(modRef.r.createdOrderProcessor.getJobId(defaultJob)).toEqual(
      defaultJob.id,
    );
    expect(modRef.r.createdOrderProcessor.getJobId(undefined)).toEqual(
      "undefined",
    );
    expect(
      modRef.r.createdOrderProcessor.getJobId(
        unsafeCoerce({ ...jobPartial, id: undefined }),
      ),
    ).toEqual(createTestId(TableNameEnum.Order, 0));
  });
});
