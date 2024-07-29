import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    browser: {
      provider: "playwright", // or 'webdriverio'
      enabled: true,
      name: "chrome", // browser name is required
    },
  },
});
