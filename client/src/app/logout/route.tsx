import {
  deleteSessionTokenCookie,
  getCurrentSession,
  invalidateSession,
} from "@/lib/sessions";
import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  const { session } = await getCurrentSession();
  if (session) {
    await invalidateSession(session.id);
    deleteSessionTokenCookie();
  }

  return NextResponse.redirect(new URL("/login", process.env.APP_URL));
}
