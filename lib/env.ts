import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  LINKSHELF_PASSWORD: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  DATABASE_CONNECT_TIMEOUT_S: z.coerce.number().int().min(1).max(60).default(10),
});

export function parseEnv(source: Record<string, string | undefined>) {
  return schema.parse(source);
}

export const env = parseEnv(process.env);
