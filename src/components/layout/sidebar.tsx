"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, FileText, Bell, LogOut,
  TrendingUp, CreditCard, BarChart3, ClipboardList, Mail,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface SidebarProps {
  notificationCount?: number;
  withdrawalCount?: number;
}

export function Sidebar({ notificationCount = 0, withdrawalCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth, isAdmin, isPM } = useAuthStore();

  const isAdminUser = isAdmin();
  const isPMUser = isPM();

  const partnerNav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Investments", href: "/dashboard/positions", icon: TrendingUp },
    { label: "Withdrawals", href: "/dashboard/withdrawals", icon: CreditCard },
    { label: "Bank Accounts", href: "/dashboard/bank-accounts", icon: CreditCard },
    { label: "Documents", href: "/dashboard/documents", icon: FileText },
    { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: notificationCount },
  ];

  const adminNav: NavItem[] = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Projects", href: "/admin/projects", icon: Building2 },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Withdrawals", href: "/admin/withdrawals", icon: CreditCard, badge: withdrawalCount },
    { label: "Emails", href: "/admin/emails", icon: Mail },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Audit Log", href: "/admin/audit", icon: ClipboardList },
  ];

  const navItems = isAdminUser || isPMUser ? adminNav : partnerNav;
  const basePath = isAdminUser || isPMUser ? "/admin" : "/dashboard";

  return (
    <div className="flex flex-col h-full bg-blue-900 text-white w-64 shrink-0">
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Investor Portal</p>
            <p className="text-xs text-blue-300">Real Estate Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== basePath && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-700 text-white"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}

        {/* Show both admin and partner links if dual role */}
        {(isAdminUser || isPMUser) && (
          <div className="pt-4 border-t border-blue-800 mt-4">
            <p className="text-xs text-blue-400 px-3 pb-2 uppercase tracking-wider">Partner View</p>
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-blue-200 hover:bg-blue-800 hover:text-white">
              <TrendingUp className="h-4 w-4" />
              My Portfolio
            </Link>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-blue-600">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-blue-300 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={clearAuth}
          className="flex items-center gap-2 text-blue-300 hover:text-white text-sm w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
