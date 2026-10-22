import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/engine/**/*.test.ts",
      "packages/data/**/*.test.ts",
      "apps/web/**/*.test.ts",
<<<<<<< HEAD
      "tools/pipeline/scripts/**/*.test.ts",
=======
      "apps/web/**/*.test.tsx",
>>>>>>> 0e22ef5 (UX-02A: center dungeon map and slim formal exploration UI.)
    ],
  },
});
