/** @jest-config-loader ts-node */
import type { Config } from "jest";
// eslint-disable-next-line no-restricted-imports -- jest
import baseConf from "./jest.config";

const config: Config = {
  ...baseConf,
  verbose: false,
  collectCoverage: true,
  bail: 1,
  testRegex: ".unit-spec.ts$",
  maxWorkers: 3,
  collectCoverageFrom: [
    "src/**/commands/**/*.command.ts",
    "src/**/domain/**/*.ts",
    "src/**/queries/**/*.query.ts",
  ],
  coverageThreshold: {
    global: {},
    "src/**/commands/**/*.command.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "src/**/domain/**/*.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "src/**/queries/**/*.query.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
export default config;
