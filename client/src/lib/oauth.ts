import { Google } from "arctic";
import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  APP_URL: z.string().url(),
});

const env = envSchema.parse(process.env);

const callbackUrl = new URL("/login/google/callback", env.APP_URL).toString();

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  callbackUrl
);
