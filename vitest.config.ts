import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/linkshelf_test",
      LINKSHELF_PASSWORD: "test-password",
      SESSION_SECRET: "test-secret-0123456789abcdef0123456789",
    },
  },
});
