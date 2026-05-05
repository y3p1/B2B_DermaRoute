import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler advisory rules from react-hooks v6 (Next 16).
      // The codebase predates these and uses standard fetch-on-mount in
      // useEffect throughout. Migrating to Suspense/use() is tracked separately.
      "react-hooks/set-state-in-effect": "off",
      // Inherent to TanStack Table / React Hook Form — unfixable in user code.
      "react-hooks/incompatible-library": "off",
      // Allow `_`-prefixed names for intentionally-unused params/vars/catch errors.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".server-dist/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
