import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // For now, always redirect to login page
  // Protected routes should be handled here later
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/"], // Only apply to home route
};
