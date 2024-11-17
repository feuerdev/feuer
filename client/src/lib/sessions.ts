import { cache } from "react";
import { cookies } from "next/headers";
import {
  SessionValidationResult,
  validateSessionToken,
} from "@shared/auth/session";

export const getCurrentSession = cache(
  async (): Promise<SessionValidationResult> => {
    const cookieStore = cookies();
    const token = cookieStore.get("session")?.value ?? null;
    if (token === null) {
      return { session: null, user: null };
    }
    const result = await validateSessionToken(token);
    return result;
  }
);

export function setSessionTokenCookie(token: string, expiresAt: Date): void {
  const cookieStore = cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function deleteSessionTokenCookie(): void {
  const cookieStore = cookies();
  cookieStore.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}
