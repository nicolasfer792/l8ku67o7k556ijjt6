import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { Dashboard } from "@/components/dashboard"
import { clearAllAuthCookies } from "@/lib/auth-actions"

export default async function Page() {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")
  const userId = cookieStore.get("admin_user_id")
  const loginTime = cookieStore.get("admin_login_time")

  if (!session || !userId || !loginTime) {
    await clearAllAuthCookies()
    redirect("/auth/login")
  }

  try {
    const loginTimestamp = Number.parseInt(loginTime.value)
    if (isNaN(loginTimestamp)) {
      await clearAllAuthCookies()
      redirect("/auth/login")
    }

    const fourDaysInMs = 4 * 24 * 60 * 60 * 1000
    const isExpired = Date.now() - loginTimestamp > fourDaysInMs

    if (isExpired) {
      await clearAllAuthCookies()
      redirect("/auth/login")
    }
  } catch (error) {
    await clearAllAuthCookies()
    redirect("/auth/login")
  }

  return <Dashboard />
}
