"use client";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";

interface HeaderProps {
  title: string;
  notificationCount?: number;
  onMenuClick?: () => void;
}

export function Header({ title, notificationCount = 0, onMenuClick }: HeaderProps) {
  const { isAdmin, isPM } = useAuthStore();
  const notifHref = isAdmin() || isPM() ? "/admin/notifications" : "/dashboard/notifications";

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 gap-4 shrink-0">
      {onMenuClick && (
        <button onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
      )}
      <h1 className="text-xl font-semibold text-gray-900 flex-1">{title}</h1>
      <Link href={notifHref} className="relative">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Button>
      </Link>
    </header>
  );
}
