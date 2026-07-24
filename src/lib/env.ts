import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PAGESPEED_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

function formatEnvError(error: z.ZodError): string {
  const issues = error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "environment";

      return `- ${key}: ${issue.message}`;
    })
    .join("\n");

  return `Invalid environment configuration:\n${issues}`;
}

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(formatEnvError(result.error));
  }

  cachedEnv = result.data;

  return cachedEnv;
}
