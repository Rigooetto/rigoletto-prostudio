import Image from "next/image";
import { requireEmployee } from "@/lib/auth/session";
import { NavLinks } from "@/components/shared/nav-links";
import { MobileNav } from "@/components/shared/mobile-nav";
import { UserMenu } from "@/components/shared/user-menu";
import { NotificationBell } from "@/components/shared/notification-bell";
import { getLiveNotifications } from "@/lib/queries/notifications";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const employee = await requireEmployee();
  const notifications = await getLiveNotifications();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-4">
          <Image
            src="/RigolettoProStudioLogo2026.png"
            alt="Rigoletto ProStudio"
            width={1536}
            height={1024}
            priority
            className="h-14 w-auto"
          />
        </div>
        <NavLinks roleCode={employee.role.code} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex items-center gap-2">
            <MobileNav roleCode={employee.role.code} />
            <span className="text-sm font-medium text-muted-foreground md:hidden">
              Rigoletto ProStudio
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell notifications={notifications} />
            <UserMenu
              name={employee.displayName ?? employee.fullName}
              roleLabel={employee.role.label}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
