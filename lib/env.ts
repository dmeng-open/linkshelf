import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    LINKSHELF_PASSWORD: z.string().min(1),
    SESSION_SECRET: z.string().min(32),
  })
  .parse(process.env);
