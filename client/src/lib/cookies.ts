import { cookies } from "next/headers";

export function setSessionTokenCookie(
  token: string,
  expiresAt: Date
): void {
  const cookieStore = cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
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
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}
