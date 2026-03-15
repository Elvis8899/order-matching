/** @jest-config-loader ts-node */
import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  bail: true,
  clearMocks: true,
  rootDir: "..",
  testEnvironment: "node",
  testRegex: "-spec.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  coveragePathIgnorePatterns: [
    "^<rootDir>/node_modules/",
    "^<rootDir>/src/configs",
    // "^<rootDir>/.*.dto.ts$",
  ],
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
    "^@configs/(.*)$": "<rootDir>/src/modules/shared/configs/$1",
    "^@shared/(.*)$": "<rootDir>/src/modules/shared/$1",
    "^@user/(.*)$": "<rootDir>/src/modules/user/$1",
    "^@auth/(.*)$": "<rootDir>/src/modules/auth/$1",
    "^@book/(.*)$": "<rootDir>/src/modules/book/$1",
    "^@rental/(.*)$": "<rootDir>/src/modules/rental/$1",
  },
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
  coverageReporters: ["json", "text-summary", "lcov", "clover", "json-summary"],
};
export default config;
