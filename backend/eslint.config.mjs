// @ts-check
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslint from "@eslint/js";
import prettierlint from "eslint-config-prettier";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    ignores: ["build/**", "coverage/**", "resources/**"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      prettierlint,
      comments.recommended,
      eslintPluginPrettierRecommended,
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./", "../"],
              message: "Relative imports are not allowed.",
            },
          ],
        },
      ],
      "no-console": "error",
      "@typescript-eslint/no-unsafe-member-access": [
        "error",
        { allowOptionalChaining: true },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // // TS errors
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@eslint-community/eslint-comments/require-description": [
        "error",
        { ignore: [] },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // // Eslint off
      "@typescript-eslint/no-extraneous-class": "off",

      // // Eslint errors
      "no-restricted-syntax": [
        "error",
        {
          selector: "LabeledStatement",
          message:
            "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.",
        },
        {
          selector: "WithStatement",
          message:
            "`with` is disallowed in strict mode because it makes code impossible to predict and optimize.",
        },
        {
          selector: "MethodDefinition[kind='set']",
          message: "Property setters are not allowed",
        },
      ],
    },
  },
  {
    // disable type-aware rules on subset of files
    files: ["**/*.{js,mjs,d.ts}"],
    ...tseslint.configs.disableTypeChecked,
  },
);
