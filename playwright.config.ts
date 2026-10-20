import { defineConfig } from "@playwright/test";

process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/linkshelf_test";
process.env.LINKSHELF_PASSWORD = "test-password";
process.env.SESSION_SECRET = "test-secret-0123456789abcdef0123456789";

export const STORAGE_STATE = "test-results/.auth/state.json";

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: { baseURL: "http://localhost:3200" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "app", dependencies: ["setup"], use: { storageState: STORAGE_STATE } },
  ],
  webServer: {
    command: "npm run db:migrate && npm run build && npm run start -- -p 3200",
    url: "http://localhost:3200/api/health",
    timeout: 180_000,
  },
});
