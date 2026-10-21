import { describe, expect, it } from "vitest";
import { parseEnv } from "../lib/env";

const base = {
  DATABASE_URL: "postgres://localhost/linkshelf",
  LINKSHELF_PASSWORD: "password",
  SESSION_SECRET: "s".repeat(32),
};

describe("parseEnv", () => {
  it("applies the pool defaults", () => {
    expect(parseEnv(base)).toMatchObject({ DATABASE_POOL_MAX: 5, DATABASE_CONNECT_TIMEOUT_S: 10 });
    expect(parseEnv({ ...base, DATABASE_POOL_MAX: "12" }).DATABASE_POOL_MAX).toBe(12);
  });

  it.each(["0", "51", "2.5", "many"])("rejects DATABASE_POOL_MAX=%s", (value) => {
    expect(() => parseEnv({ ...base, DATABASE_POOL_MAX: value })).toThrow();
  });

  it("still rejects a short SESSION_SECRET", () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: "short" })).toThrow();
  });
});
