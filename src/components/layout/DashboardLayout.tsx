import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { Home, FolderTree, Upload, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", label: "나의 인증 현황", icon: Home },
  { to: "/curriculum", label: "이수체계도", icon: FolderTree },
  { to: "/upload", label: "성적 재업로드", icon: Upload },
]

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-svh bg-white">
      {/* 사이드바 */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-[#FBF8F4] px-4 py-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-sejong">세종대학교</h1>
          <p className="mt-0.5 text-xs text-sejong">졸업 인증 분석</p>
        </div>

        <p className="mt-10 mb-3 text-sm font-medium text-muted-foreground">
          Main page
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sejong/10 text-sejong"
                    : "text-foreground/70 hover:bg-muted"
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-200 pt-4">
          {user && (
            <p className="mb-2 px-3 text-xs text-muted-foreground">
              {user.name} ({user.studentNo})
            </p>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
          >
            <LogOut className="size-5" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 본문 */}
      <main className="flex-1 overflow-x-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
