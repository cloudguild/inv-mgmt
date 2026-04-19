"use client";
import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePlaidLink } from "react-plaid-link";
import { Plus, CheckCircle, XCircle, Clock, Shield, Link2, DollarSign, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface BankAccount { id: string; accountHolder: string; bankName: string; accountType: string; routingLast4: string; accountLast4: string; nickname?: string; isPrimary: boolean; verificationStatus: string }
interface PlaidAccount { connectionId: string; institutionName: string; accountId: string; name: string; mask: string; type: string; subtype: string; balanceCurrent: number | null; balanceAvailable: number | null }
interface Transfer { id: string; type: string; amount: string; status: string; description: string | null; createdAt: string; project: { name: string } }
interface Project { id: string; name: string }

const bankSchema = z.object({
  accountHolder: z.string().min(1),
  bankName: z.string().min(1),
  accountType: z.enum(["checking","savings","business_checking"]),
  routingNumber: z.string().length(9),
  accountNumber: z.string().min(4),
  nickname: z.string().optional(),
});
type BankForm = z.infer<typeof bankSchema>;

const verifySchema = z.object({
  amount1: z.number().positive(),
  amount2: z.number().positive(),
});
type VerifyForm = z.infer<typeof verifySchema>;

function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    api.post("/api/plaid/link-token", {}).then(async (r) => {
      if (r.ok) { const d = await r.json(); setToken(d.link_token); }
    });
  }, []);

  const { open, ready } = usePlaidLink({
    token: token ?? "",
    onSuccess: async (public_token) => {
      const res = await api.post("/api/plaid/exchange", { public_token });
      if (res.ok) onSuccess();
    },
  });

  return (
    <Button onClick={() => open()} disabled={!ready || !token} variant="outline">
      <Link2 className="h-4 w-4 mr-1" /> Link Bank via Plaid
    </Button>
  );
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ connectionId: "", accountId: "", projectId: "", type: "deposit", amount: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const bankForm = useForm<BankForm>({ resolver: zodResolver(bankSchema), defaultValues: { accountType: "checking" } });
  const verifyForm = useForm<VerifyForm>({ resolver: zodResolver(verifySchema) });

  const load = useCallback(async () => {
    const [accRes, plaidRes, txRes, projRes] = await Promise.all([
      api.get("/api/bank-accounts"),
      api.get("/api/plaid/accounts"),
      api.get("/api/plaid/transfers"),
      api.get("/api/projects"),
    ]);
    if (accRes.ok) setAccounts(await accRes.json());
    if (plaidRes.ok) setPlaidAccounts(await plaidRes.json());
    if (txRes.ok) setTransfers(await txRes.json());
    if (projRes.ok) setProjects(await projRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAddAccount = async (data: BankForm) => {
    const res = await api.post("/api/bank-accounts", data);
    if (res.ok) { await load(); setAddOpen(false); bankForm.reset(); }
  };

  const onVerify = async (data: VerifyForm) => {
    if (!verifyId) return;
    await api.post(`/api/bank-accounts/${verifyId}/verify`, data);
    await load(); setVerifyId(null); verifyForm.reset();
  };

  const onTransfer = async () => {
    if (!transferForm.connectionId || !transferForm.accountId || !transferForm.projectId || !transferForm.amount) return;
    setSubmitting(true);
    const res = await api.post("/api/plaid/transfers", {
      connectionId: transferForm.connectionId,
      accountId: transferForm.accountId,
      projectId: transferForm.projectId,
      type: transferForm.type,
      amount: parseFloat(transferForm.amount),
      description: transferForm.description || undefined,
    });
    if (res.ok) { await load(); setTransferOpen(false); }
    setSubmitting(false);
  };

  const statusIcon = (s: string) => s === "verified" ? <CheckCircle className="h-5 w-5 text-green-500" /> : s === "failed" ? <XCircle className="h-5 w-5 text-red-500" /> : <Clock className="h-5 w-5 text-amber-500" />;

  return (
    <AppLayout title="Banking">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Manage bank accounts and fund transfers</p>
          <div className="flex gap-2">
            <PlaidLinkButton onSuccess={load} />
            <Button onClick={() => setAddOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add Manually
            </Button>
            {plaidAccounts.length > 0 && (
              <Button onClick={() => setTransferOpen(true)}>
                <DollarSign className="h-4 w-4 mr-1" /> Transfer Funds
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>
        ) : (
          <>
            {/* Plaid-linked accounts */}
            {plaidAccounts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Linked Accounts (via Plaid)</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {plaidAccounts.map((acc) => (
                    <Card key={acc.accountId} className="border-green-200">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{acc.institutionName}</p>
                            <p className="text-xs text-gray-500">{acc.name} ···{acc.mask}</p>
                          </div>
                          <Badge variant="success">Linked</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-400">Available</p>
                            <p className="font-mono font-medium">{acc.balanceAvailable != null ? formatCurrency(acc.balanceAvailable) : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Current</p>
                            <p className="font-mono font-medium">{acc.balanceCurrent != null ? formatCurrency(acc.balanceCurrent) : "—"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Manual bank accounts */}
            {accounts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Manual Accounts</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {accounts.map((a) => (
                    <Card key={a.id} className={a.isPrimary ? "border-blue-300" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {statusIcon(a.verificationStatus)}
                            <div>
                              <CardTitle className="text-sm">{a.bankName}</CardTitle>
                              {a.nickname && <p className="text-xs text-gray-500">{a.nickname}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {a.isPrimary && <Badge variant="default">Primary</Badge>}
                            <Badge variant={a.verificationStatus === "verified" ? "success" : a.verificationStatus === "failed" ? "danger" : "warning"}>{a.verificationStatus}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><p className="text-xs text-gray-400">Holder</p><p className="font-medium">{a.accountHolder}</p></div>
                          <div><p className="text-xs text-gray-400">Type</p><p className="font-medium capitalize">{a.accountType.replace(/_/g," ")}</p></div>
                          <div><p className="text-xs text-gray-400">Account</p><p className="font-mono">···{a.accountLast4}</p></div>
                          <div><p className="text-xs text-gray-400">Routing</p><p className="font-mono">···{a.routingLast4}</p></div>
                        </div>
                        {a.verificationStatus === "pending" && (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => setVerifyId(a.id)}>
                            <Shield className="h-3 w-3 mr-1" /> Enter Micro-Deposit Amounts
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {accounts.length === 0 && plaidAccounts.length === 0 && (
              <Card><CardContent className="py-16 text-center">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bank accounts linked yet.</p>
                <p className="text-sm text-gray-400 mt-1">Use Plaid Link for instant connection, or add manually.</p>
              </CardContent></Card>
            )}

            {/* Fund transfer history */}
            {transfers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Fund Transfer History</h3>
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50">
                        <tr>{["Date","Project","Type","Amount","Status"].map((h)=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y">
                        {transfers.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500">{formatDate(t.createdAt)}</td>
                            <td className="px-3 py-2">{t.project.name}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {t.type === "deposit" ? <ArrowDownCircle className="h-3.5 w-3.5 text-green-600" /> : <ArrowUpCircle className="h-3.5 w-3.5 text-orange-500" />}
                                <span className="capitalize">{t.type}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 font-mono">{formatCurrency(Number(t.amount))}</td>
                            <td className="px-3 py-2 capitalize text-gray-500">{t.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Manual Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Bank Account Manually</DialogTitle></DialogHeader>
          <form onSubmit={bankForm.handleSubmit(onAddAccount)} className="space-y-3">
            <div><Label>Account Holder *</Label><Input {...bankForm.register("accountHolder")} /></div>
            <div><Label>Bank Name *</Label><Input {...bankForm.register("bankName")} /></div>
            <div>
              <Label>Account Type *</Label>
              <Select onValueChange={(v) => bankForm.setValue("accountType", v as "checking"|"savings"|"business_checking")} defaultValue="checking">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="business_checking">Business Checking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Routing Number (9 digits) *</Label><Input {...bankForm.register("routingNumber")} maxLength={9} /></div>
            <div><Label>Account Number *</Label><Input type="password" {...bankForm.register("accountNumber")} /></div>
            <div><Label>Nickname</Label><Input {...bankForm.register("nickname")} /></div>
            <p className="text-xs text-gray-400 bg-blue-50 p-2 rounded">2 micro-deposits will be sent within 1–3 business days for verification.</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit">Add Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={!!verifyId} onOpenChange={() => setVerifyId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify Bank Account</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Enter the two micro-deposit amounts sent to your account.</p>
          <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Amount ($)</Label><Input type="number" step="0.01" {...verifyForm.register("amount1", { valueAsNumber: true })} /></div>
              <div><Label>Second Amount ($)</Label><Input type="number" step="0.01" {...verifyForm.register("amount2", { valueAsNumber: true })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVerifyId(null)}>Cancel</Button>
              <Button type="submit">Verify</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transfer Funds</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Linked Account</Label>
              <Select onValueChange={(v) => {
                const [connId, accId] = v.split("|");
                setTransferForm((f) => ({ ...f, connectionId: connId, accountId: accId }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {plaidAccounts.map((a) => (
                    <SelectItem key={a.accountId} value={`${a.connectionId}|${a.accountId}`}>
                      {a.institutionName} — {a.name} ···{a.mask}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select onValueChange={(v) => setTransferForm((f) => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={transferForm.type} onValueChange={(v) => setTransferForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit (add funds)</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal (receive funds)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={transferForm.amount} onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>Description (optional)</Label><Input value={transferForm.description} onChange={(e) => setTransferForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 p-2 rounded">ACH transfers take 1–3 business days to settle. Plaid sandbox mode is used in development.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={onTransfer} disabled={submitting || !transferForm.connectionId || !transferForm.projectId || !transferForm.amount}>
              {submitting ? "Processing…" : "Submit Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
