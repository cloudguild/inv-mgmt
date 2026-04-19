"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { api } from "@/lib/api";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  requireAdmin?: boolean;
  requireAdminOrPM?: boolean;
}

export function AppLayout({ children, title, requireAdmin = false, requireAdminOrPM = false }: AppLayoutProps) {
  const router = useRouter();
  const { user, isAdmin, isPM } = useAuthStore();
  const [notificationCount, setNotificationCount] = useState(0);
  const [withdrawalCount, setWithdrawalCount] = useState(0);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireAdmin && !isAdmin()) {
      router.replace("/dashboard");
      return;
    }
    if (requireAdminOrPM && !isAdmin() && !isPM()) {
      router.replace("/dashboard");
      return;
    }
  }, [user, isAdmin, isPM, requireAdmin, requireAdminOrPM, router]);

  useEffect(() => {
    if (!user) return;
    api.get("/api/notifications").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setNotificationCount(data.filter((n: { isRead: boolean }) => !n.isRead).length);
      }
    });
    if (isAdmin()) {
      api.get("/api/withdrawals?status=pending").then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setWithdrawalCount(data.length);
        }
      });
    }
  }, [user, isAdmin]);

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar notificationCount={notificationCount} withdrawalCount={withdrawalCount} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} notificationCount={notificationCount} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
