import { NextResponse, type NextRequest } from "next/server";

/** Coarse route protection by session cookie; role checks happen in the layouts. */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("ireti_session");
  const { pathname } = req.nextUrl;
  const protectedArea = pathname.startsWith("/sme") || pathname.startsWith("/bank");
  if (protectedArea && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/sign-in" || pathname === "/sign-up") && hasSession) {
    // Let the page decide where to send a signed-in user.
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = { matcher: ["/sme/:path*", "/bank/:path*", "/sign-in", "/sign-up"] };
