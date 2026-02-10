import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Only run Supabase session refresh on protected routes
  if (request.nextUrl.pathname.startsWith("/me")) {
    return await updateSession(request);
  }

  // All other routes pass through without Supabase call
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
