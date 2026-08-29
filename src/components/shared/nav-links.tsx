"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarClock,
  CalendarDays,
  Target,
  FileText,
  CheckSquare,
  DollarSign,
  Receipt,
  Wallet,
  TrendingUp,
  Megaphone,
  BarChart3,
  Settings,
  Music2,
  UserCog,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleCode } from "@/generated/prisma/enums";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const overviewNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

const studioNav: NavItem[] = [
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/sessions", label: "Sessions", icon: CalendarClock },
];

const salesNav: NavItem[] = [
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

// Admin-only — these pages call requireRole('ADMIN') themselves; keep this
// list in sync with that or a non-Admin will see a link that 500s.
const adminFinanceNav: NavItem[] = [
  { href: "/finance", label: "Financial Dashboard", icon: DollarSign },
  { href: "/expenses", label: "Expenses", icon: Wallet },
];

const adminGrowthNav: NavItem[] = [
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const compensationNav: NavItem[] = [{ href: "/compensation", label: "Compensation", icon: TrendingUp }];

const settingsNav: NavItem[] = [
  { href: "/settings/services", label: "Services", icon: Music2 },
  { href: "/settings/lead-sources", label: "Lead Sources", icon: Settings },
  { href: "/settings/compensation-tiers", label: "Compensation Tiers", icon: TrendingUp },
  { href: "/settings/users", label: "Users", icon: UserCog },
  { href: "/settings/audit-log", label: "Audit Log", icon: ClipboardList },
  { href: "/settings/month-end-close", label: "Month-End Close", icon: CalendarDays },
];

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function NavSection({ label, items, onNavigate }: { label?: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">{label}</p>
      )}
      {items.map((item) => (
        <NavLink key={item.href} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export function NavLinks({ roleCode, onNavigate }: { roleCode: RoleCode; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <NavSection items={overviewNav} onNavigate={onNavigate} />
      <NavSection label="Studio" items={studioNav} onNavigate={onNavigate} />
      <NavSection label="Sales" items={salesNav} onNavigate={onNavigate} />
      {roleCode === "ADMIN" && <NavSection label="Finance" items={adminFinanceNav} onNavigate={onNavigate} />}
      {roleCode === "ADMIN" && <NavSection label="Growth" items={adminGrowthNav} onNavigate={onNavigate} />}
      <NavSection label="Compensation" items={compensationNav} onNavigate={onNavigate} />

      {roleCode === "ADMIN" && <NavSection label="Settings" items={settingsNav} onNavigate={onNavigate} />}
    </nav>
  );
}
