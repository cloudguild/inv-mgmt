"use client";
import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; email: string };
}

const actionColor = (action: string) => {
  if (action.startsWith("create")) return "success";
  if (action.startsWith("delete") || action.startsWith("reject")) return "danger";
  if (action.startsWith("update") || action.startsWith("approve")) return "warning";
  return "secondary";
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (entityType !== "all") params.set("entityType", entityType);
    const res = await api.get(`/api/audit?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setPages(data.pages);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, entityType]);

  useEffect(() => { load(); }, [load]);

  const fmt = (dt: string) =>
    new Date(dt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });

  return (
    <AppLayout title="Audit Log" requireAdmin>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{total} total events</p>
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {["user", "project", "withdrawal", "payout", "expense", "bankAccount", "task", "phase"].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      {["Time", "User", "Action", "Entity", "Details"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No audit events found.</td></tr>
                    ) : logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{log.user.name}</p>
                          <p className="text-xs text-gray-400">{log.user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={actionColor(log.action) as "success" | "danger" | "warning" | "secondary"}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-gray-600">{log.entityType}</span>
                          <p className="text-xs text-gray-400 font-mono">{log.entityId.slice(0, 8)}…</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === pages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
