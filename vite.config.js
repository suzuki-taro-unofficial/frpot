import { defineConfig } from "vite";

/** @type {import('vite').UserConfig} */
export default defineConfig((command) => {
  if (command === "build") {
    return {
      base: "/frpot",
    };
  } else {
    return {
      base: "/",
    };
  }
});
