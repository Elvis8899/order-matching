import { Provider } from "@nestjs/common";
import { Test, TestingModule, TestingModuleBuilder } from "@nestjs/testing";

export class IntegrationModule<U extends object> {
  /** Instances of either injectable or controller */
  r!: U;
  repositoryLoader!: (app: TestingModule) => U;
  //
  builder!: TestingModuleBuilder;
  testingModule!: TestingModule;

  constructor(providers: Provider[], fn: (app: TestingModule) => U) {
    this.builder = Test.createTestingModule({
      providers,
    });
    this.repositoryLoader = fn;
  }

  async init() {
    this.testingModule = await this.builder.compile();
    await this.testingModule.init();
    this.r = this.repositoryLoader(this.testingModule);
  }
}
