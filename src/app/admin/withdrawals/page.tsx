"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { CheckCircle, XCircle } from "lucide-react";

interface Withdrawal {
  id: string;
  amount: number;
  type: string;
  status: string;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  project: { id: string; name: string };
  bankAccount: { bankName: string; accountLast4: string; nickname?: string };
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [pmNote, setPmNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    const [pending, recent] = await Promise.all([
      api.get("/api/withdrawals?status=pending").then(r => r.ok ? r.json() : []),
      api.get("/api/withdrawals").then(r => r.ok ? r.json() : []),
    ]);
    // Merge: show pending first, then recently processed
    const pendingIds = new Set(pending.map((w: Withdrawal) => w.id));
    const others = recent.filter((w: Withdrawal) => !pendingIds.has(w.id) && w.status !== "pending").slice(0, 10);
    setWithdrawals([...pending, ...others]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async () => {
    if (!actionItem) return;
    setProcessing(true);
    const url = `/api/withdrawals/${actionItem.id}/${actionItem.action}`;
    const body = actionItem.action === "approve"
      ? { pmNote }
      : { rejectionReason, pmNote };
    await api.post(url, body);
    setActionItem(null);
    setPmNote("");
    setRejectionReason("");
    await load();
    setProcessing(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
      completed: "success", pending: "warning", approved: "success",
      rejected: "danger", processing: "secondary", draft: "secondary",
    };
    return map[status] || "secondary";
  };

  const pending = withdrawals.filter((w) => w.status === "pending");
  const processed = withdrawals.filter((w) => w.status !== "pending");

  return (
    <AppLayout title="Withdrawal Approvals" requireAdminOrPM>
      <div className="space-y-6">
        {/* Pending Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Pending Approval Queue</CardTitle>
              {pending.length > 0 && (
                <Badge variant="warning">{pending.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-gray-500">All requests have been actioned.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold">{w.user.name}</p>
                          <p className="text-sm text-gray-500">{w.project.name}</p>
                          <p className="text-xs text-gray-400">{w.user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="font-bold text-lg">{formatCurrency(w.amount)}</span>
                        <Badge variant="secondary">{w.type.replace(/_/g, " ")}</Badge>
                        <span className="text-gray-400">→ {w.bankAccount.bankName} ****{w.bankAccount.accountLast4}</span>
                      </div>
                      {w.notes && <p className="text-sm text-gray-600 mt-1">Note: {w.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">Requested {formatDate(w.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => setActionItem({ id: w.id, action: "approve" })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setActionItem({ id: w.id, action: "reject" })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Processed */}
        {processed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recently Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      {["Partner", "Project", "Amount", "Type", "Status", "Date"].map((h) => (
                        <th key={h} className="text-left px-2 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {processed.map((w) => (
                      <tr key={w.id}>
                        <td className="px-2 py-2">{w.user.name}</td>
                        <td className="px-2 py-2 text-gray-500">{w.project.name}</td>
                        <td className="px-2 py-2 font-semibold">{formatCurrency(w.amount)}</td>
                        <td className="px-2 py-2">{w.type.replace(/_/g, " ")}</td>
                        <td className="px-2 py-2"><Badge variant={statusBadge(w.status)}>{w.status}</Badge></td>
                        <td className="px-2 py-2 text-gray-400">{formatDate(w.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!actionItem} onOpenChange={() => setActionItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionItem?.action === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionItem?.action === "reject" && (
              <div className="space-y-1">
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this request..."
                  rows={3}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>PM Note (optional)</Label>
              <Textarea
                value={pmNote}
                onChange={(e) => setPmNote(e.target.value)}
                placeholder="Add an internal note..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionItem(null)}>Cancel</Button>
            <Button
              variant={actionItem?.action === "approve" ? "success" : "destructive"}
              onClick={handleAction}
              disabled={processing || (actionItem?.action === "reject" && !rejectionReason)}
            >
              {processing ? "Processing..." : actionItem?.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
