import { defineConfig } from "@playwright/test";

process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/linkshelf_test";

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: { baseURL: "http://localhost:3200" },
  webServer: {
    command: "npm run db:migrate && npm run build && npm run start -- -p 3200",
    url: "http://localhost:3200/api/health",
    timeout: 180_000,
  },
});
