import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // mobile/ is a separate Expo project with its own package.json,
    // TypeScript config, and lint setup (run via `npx expo lint` from
    // inside mobile/) -- it was never meant to be linted by the web
    // app's Next.js-flavored config, which flags mobile's CommonJS
    // config files (metro.config.js, tailwind.config.js) as errors.
    "mobile/**",
  ]),
]);

export default eslintConfig;
