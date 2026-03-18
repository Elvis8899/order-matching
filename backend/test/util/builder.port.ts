export abstract class BuilderPort<U> {
  protected defaultProperties!: U;
  protected overrides!: U;

  reset() {
    this.overrides = {
      ...this.defaultProperties,
    };
    return this;
  }

  abstract build(): unknown;
}
