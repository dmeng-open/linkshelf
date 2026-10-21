import { sql as raw } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/client";
import { clearFailures, recentFailures, recordFailure } from "../db/login-failures";
import { loginFailures } from "../db/schema";
import "./db";

const hourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

beforeEach(async () => {
  await db.execute(raw`truncate table login_failures`);
});

describe("login failures", () => {
  it("returns a recorded failure", async () => {
    await recordFailure("203.0.113.7");

    const failures = await recentFailures("203.0.113.7", hourAgo());

    expect(failures).toHaveLength(1);
    expect(failures[0]).toBeInstanceOf(Date);
  });

  it("clears only one client's failures", async () => {
    await recordFailure("a");
    await recordFailure("b");

    await clearFailures("a");

    expect(await recentFailures("a", hourAgo())).toEqual([]);
    expect(await recentFailures("b", hourAgo())).toHaveLength(1);
  });

  it("prunes rows older than a day on the next failure", async () => {
    await db.insert(loginFailures).values({ client: "old", failedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });

    await recordFailure("new");

    const clients = (await db.select({ client: loginFailures.client }).from(loginFailures)).map((r) => r.client);
    expect(clients).toEqual(["new"]);
  });
});
