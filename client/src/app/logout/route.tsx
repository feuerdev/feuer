import { deleteSessionTokenCookie, getCurrentSession } from "@/lib/sessions";
import { invalidateSession } from "@shared/auth/session";
import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  const { session } = await getCurrentSession();
  if (session) {
    await invalidateSession(session.id);
    deleteSessionTokenCookie();
  }

  return NextResponse.redirect(new URL("/login", process.env.APP_URL));
}
