// Own standalone config so this project's lint doesn't depend on
// resolution walking up to ../eslint.config.mjs (the web app's,
// Next.js-flavored, and explicitly excludes "mobile/**" -- see its own
// comment). `npx expo lint` from this directory uses this file.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ["dist/**"],
  },
]);
