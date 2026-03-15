/** @jest-config-loader ts-node */
import type { Config } from "jest";
// eslint-disable-next-line no-restricted-imports -- jest
import baseConf from "./jest.config";

const config: Config = {
  ...baseConf,
  verbose: false,
  collectCoverage: true,
  testRegex: ".inte-spec.ts$",
  collectCoverageFrom: ["src/**/database/real*.ts"],
  coverageThreshold: {
    global: {},
    "src/**/database/real*.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

export default config;
