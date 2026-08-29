import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Optimistic check only — reads the session cookie/JWT, no DB call.
// The real authorization boundary is getCurrentEmployee()/requireRole()
// in src/lib/auth/session.ts, used by every page, query, and Server Action.
const publicRoutes = ["/login"];

export default async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!session?.user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session?.user && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excludes anything with a file extension (images, icons, etc. served out
  // of /public) in addition to the API/Next internals — without this, static
  // assets get redirected to /login for unauthenticated requests, which also
  // breaks Next's image optimizer: it fetches local images via a loopback
  // HTTP request that passes back through this same middleware.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
