"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await api.get("/api/notifications");
    if (res.ok) setNotifications(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await api.patch("/api/notifications", {});
    await load();
  };

  const markRead = async (id: string) => {
    await api.patch("/api/notifications", { ids: [id] });
    await load();
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <AppLayout title="Notifications">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-500">{unread} unread</span>
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`cursor-pointer transition-colors ${!n.isRead ? "border-blue-200 bg-blue-50/30" : ""}`}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{n.title}</p>
                        {!n.isRead && <Badge variant="default" className="text-xs">New</Badge>}
                      </div>
                      <p className="text-sm text-gray-600">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
