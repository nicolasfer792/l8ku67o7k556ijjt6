import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("admin_session")
  const userId = request.cookies.get("admin_user_id")
  const loginTime = request.cookies.get("admin_login_time")

  const hasValidCookies = !!(session && userId && loginTime)

  let isExpired = false
  if (loginTime) {
    const loginTimestamp = Number.parseInt(loginTime.value)
    const fourDaysInMs = 4 * 24 * 60 * 60 * 1000
    isExpired = Date.now() - loginTimestamp > fourDaysInMs
  }

  const isAuthenticated = hasValidCookies && !isExpired

  const isProtectedPath = request.nextUrl.pathname === "/"

  // Si está en ruta protegida y no autenticado, redirigir al login
  if (isProtectedPath && !isAuthenticated) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url))
    if (isExpired || !hasValidCookies) {
      response.cookies.delete("admin_session")
      response.cookies.delete("admin_user_id")
      response.cookies.delete("admin_login_time")
    }
    return response
  }

  // Si está autenticado y trata de acceder al login, redirigir al dashboard
  if (request.nextUrl.pathname === "/auth/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
