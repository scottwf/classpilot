import { NextResponse, type NextRequest } from "next/server";
import { clearAuthCookie } from "@/src/lib/auth/server";

/**
 * Plain Route Handler for the same reason as /login/submit -- a Server
 * Action's cookie mutation goes over fetch, which iOS standalone PWAs don't
 * reliably persist. A real top-level POST navigation does.
 */
export async function POST(request: NextRequest) {
  await clearAuthCookie();

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
