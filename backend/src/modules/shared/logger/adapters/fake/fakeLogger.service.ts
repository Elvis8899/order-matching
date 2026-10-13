import { ConsoleLogger } from "@nestjs/common";
import { noop } from "@shared/utils/application/noop";

export class FakeLoggerService extends ConsoleLogger {
  readonly contextName: string;

  constructor(readonly logger: null) {
    super();
    this.contextName = "context";
  }

  public log = noop;
  public debug = noop;
  public verbose = noop;
  public trace = noop;
  public fatal = noop;
  public info = noop;
  public warn = noop;
  public error = noop;
  public setContext = noop;
}
