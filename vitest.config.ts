import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/db.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/linkshelf_test",
    },
  },
});
