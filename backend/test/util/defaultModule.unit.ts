import { TestingModule, TestingModuleBuilder } from "@nestjs/testing";

export class UnitModule<U extends object> {
  /** Instances of either injectable or controller */
  r!: U;
  repositoryLoader!: (app: TestingModule) => U;
  //
  builder!: TestingModuleBuilder;
  testingModule!: TestingModule;

  constructor(builder: TestingModuleBuilder, fn: (app: TestingModule) => U) {
    this.builder = builder;
    this.repositoryLoader = fn;
  }

  async init() {
    this.testingModule = await this.builder.compile();
    this.r = this.repositoryLoader(this.testingModule);
  }
}
