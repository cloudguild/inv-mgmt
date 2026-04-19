"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, AlertCircle } from "lucide-react";

interface BankAccount {
  id: string;
  bankName: string;
  accountLast4: string;
  nickname?: string;
  verificationStatus: string;
}

interface Project {
  id: string;
  name: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  type: string;
  status: string;
  notes: string | null;
  createdAt: string;
  project: { name: string };
  bankAccount: { bankName: string; accountLast4: string };
}

const WITHDRAWAL_TYPES = [
  { value: "interest", label: "Interest Payment" },
  { value: "principal", label: "Principal Repayment" },
  { value: "profit_distribution", label: "Profit Distribution" },
  { value: "partial", label: "Partial Withdrawal" },
];

const statusBadge = (status: string) => {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    completed: "success", pending: "warning", approved: "success",
    rejected: "danger", processing: "secondary", draft: "secondary",
  };
  return map[status] || "secondary";
};

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    type: "",
    projectId: "",
    bankAccountId: "",
    notes: "",
  });

  const load = async () => {
    const [w, ba, pr] = await Promise.all([
      api.get("/api/withdrawals").then(r => r.ok ? r.json() : []),
      api.get("/api/bank-accounts").then(r => r.ok ? r.json() : []),
      api.get("/api/projects").then(r => r.ok ? r.json() : []),
    ]);
    setWithdrawals(w);
    setBankAccounts(ba.filter((b: BankAccount) => b.verificationStatus === "verified"));
    setProjects(pr);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const verifiedAccounts = bankAccounts.filter((b) => b.verificationStatus === "verified");

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await api.post("/api/withdrawals", {
      ...formData,
      amount: parseFloat(formData.amount),
    });
    if (res.ok) {
      await load();
      setConfirmOpen(false);
      setFormOpen(false);
      setFormData({ amount: "", type: "", projectId: "", bankAccountId: "", notes: "" });
    }
    setSubmitting(false);
  };

  return (
    <AppLayout title="Withdrawal Requests">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Request funds from your investments</p>
          <Button onClick={() => { setFormOpen(true); setStep(1); }}>
            <Plus className="h-4 w-4 mr-1" />
            New Withdrawal Request
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
          </div>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Your Requests</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      {["Date", "Project", "Amount", "Type", "Bank Account", "Status"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {withdrawals.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No withdrawal requests yet.</td></tr>
                    ) : (
                      withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{formatDate(w.createdAt)}</td>
                          <td className="px-4 py-3">{w.project.name}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(w.amount)}</td>
                          <td className="px-4 py-3 capitalize">{w.type.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3 text-gray-500">{w.bankAccount.bankName} ****{w.bankAccount.accountLast4}</td>
                          <td className="px-4 py-3"><Badge variant={statusBadge(w.status)}>{w.status}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Step 1: Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal — Step 1 of 2</DialogTitle>
            <DialogDescription>Fill in the withdrawal details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Project *</Label>
              <Select onValueChange={(v) => setFormData((p) => ({ ...p, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {WITHDRAWAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Bank Account *</Label>
              {verifiedAccounts.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No verified bank accounts. Please add and verify a bank account first.
                </div>
              ) : (
                <Select onValueChange={(v) => setFormData((p) => ({ ...p, bankAccountId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select verified account" /></SelectTrigger>
                  <SelectContent>
                    {verifiedAccounts.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bankName} ****{b.accountLast4} {b.nickname ? `(${b.nickname})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <Label>Note for PM (optional)</Label>
              <Textarea
                placeholder="Any additional context..."
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              disabled={!formData.amount || !formData.type || !formData.projectId || !formData.bankAccountId}
              onClick={() => { setFormOpen(false); setConfirmOpen(true); }}
            >
              Review & Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: Confirm */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal — Step 2 of 2</DialogTitle>
            <DialogDescription>Review your request before submitting</DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-semibold text-lg">{formData.amount ? formatCurrency(parseFloat(formData.amount)) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span>{WITHDRAWAL_TYPES.find((t) => t.value === formData.type)?.label || formData.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Project</span>
              <span>{projects.find((p) => p.id === formData.projectId)?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">To Account</span>
              <span>{(() => { const b = verifiedAccounts.find((b) => b.id === formData.bankAccountId); return b ? `${b.bankName} ****${b.accountLast4}` : "—"; })()}</span>
            </div>
            {formData.notes && (
              <div className="flex justify-between">
                <span className="text-gray-500">Note</span>
                <span className="text-right max-w-xs">{formData.notes}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">Your request will enter the PM approval queue. You will be notified by email of the decision.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setFormOpen(true); }}>Back</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
