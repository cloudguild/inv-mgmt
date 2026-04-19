"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Plus, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface BankAccount {
  id: string;
  accountHolder: string;
  bankName: string;
  accountType: string;
  routingLast4: string;
  accountLast4: string;
  nickname?: string;
  isPrimary: boolean;
  verificationStatus: string;
  verifiedAt?: string;
}

const bankSchema = z.object({
  accountHolder: z.string().min(1, "Account holder required"),
  bankName: z.string().min(1, "Bank name required"),
  accountType: z.enum(["checking", "savings", "business_checking"]),
  routingNumber: z.string().length(9, "Routing number must be 9 digits"),
  accountNumber: z.string().min(4, "Account number required"),
  nickname: z.string().optional(),
});

type BankForm = z.infer<typeof bankSchema>;

const verifySchema = z.object({
  amount1: z.number().positive("Enter deposit amount"),
  amount2: z.number().positive("Enter deposit amount"),
});
type VerifyForm = z.infer<typeof verifySchema>;

const statusIcon = (status: string) => {
  if (status === "verified") return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === "failed") return <XCircle className="h-5 w-5 text-red-500" />;
  return <Clock className="h-5 w-5 text-amber-500" />;
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const bankForm = useForm<BankForm>({ resolver: zodResolver(bankSchema), defaultValues: { accountType: "checking" } });
  const verifyForm = useForm<VerifyForm>({ resolver: zodResolver(verifySchema) });

  const load = async () => {
    const res = await api.get("/api/bank-accounts");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onAddAccount = async (data: BankForm) => {
    setAdding(true);
    const res = await api.post("/api/bank-accounts", data);
    if (res.ok) { await load(); setAddOpen(false); bankForm.reset(); }
    setAdding(false);
  };

  const onVerify = async (data: VerifyForm) => {
    if (!verifyId) return;
    setVerifying(true);
    await api.post(`/api/bank-accounts/${verifyId}/verify`, data);
    await load();
    setVerifyId(null);
    verifyForm.reset();
    setVerifying(false);
  };

  return (
    <AppLayout title="Bank Accounts">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Manage your verified bank accounts for withdrawals</p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Bank Account
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
          </div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bank accounts added yet.</p>
              <p className="text-sm text-gray-400 mt-1">Add and verify a bank account to request withdrawals.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((a) => (
              <Card key={a.id} className={a.isPrimary ? "border-blue-300" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon(a.verificationStatus)}
                      <div>
                        <CardTitle className="text-sm">{a.bankName}</CardTitle>
                        {a.nickname && <p className="text-xs text-gray-500">{a.nickname}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.isPrimary && <Badge variant="default">Primary</Badge>}
                      <Badge variant={a.verificationStatus === "verified" ? "success" : a.verificationStatus === "failed" ? "danger" : "warning"}>
                        {a.verificationStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Account Holder</p>
                      <p className="font-medium">{a.accountHolder}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Account Type</p>
                      <p className="font-medium capitalize">{a.accountType.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Account Number</p>
                      <p className="font-medium font-mono">****{a.accountLast4}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Routing Number</p>
                      <p className="font-medium font-mono">****{a.routingLast4}</p>
                    </div>
                  </div>

                  {a.verificationStatus === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setVerifyId(a.id)}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Enter Micro-Deposit Amounts
                    </Button>
                  )}
                  {a.verificationStatus === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setVerifyId(a.id)}
                    >
                      Retry Verification
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <form onSubmit={bankForm.handleSubmit(onAddAccount)} className="space-y-4">
            <div className="space-y-1">
              <Label>Account Holder Name *</Label>
              <Input {...bankForm.register("accountHolder")} placeholder="John Smith" />
              {bankForm.formState.errors.accountHolder && <p className="text-xs text-red-600">{bankForm.formState.errors.accountHolder.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Bank Name *</Label>
              <Input {...bankForm.register("bankName")} placeholder="Chase Bank" />
            </div>
            <div className="space-y-1">
              <Label>Account Type *</Label>
              <Select onValueChange={(v) => bankForm.setValue("accountType", v as "checking" | "savings" | "business_checking")} defaultValue="checking">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="business_checking">Business Checking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Routing Number *</Label>
              <Input {...bankForm.register("routingNumber")} placeholder="021000021" maxLength={9} />
              {bankForm.formState.errors.routingNumber && <p className="text-xs text-red-600">{bankForm.formState.errors.routingNumber.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Account Number *</Label>
              <Input type="password" {...bankForm.register("accountNumber")} placeholder="Enter account number" />
            </div>
            <div className="space-y-1">
              <Label>Nickname (optional)</Label>
              <Input {...bankForm.register("nickname")} placeholder="Personal Checking" />
            </div>
            <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
              After adding, 2 micro-deposits (under $1 each) will be sent to your account within 1-3 business days.
              You will need to verify the exact amounts.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? "Adding..." : "Add Account"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={!!verifyId} onOpenChange={() => { setVerifyId(null); verifyForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Bank Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Enter the two small deposit amounts sent to your bank account (usually within 1-3 business days).
          </p>
          <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Deposit ($)</Label>
                <Input type="number" step="0.01" {...verifyForm.register("amount1", { valueAsNumber: true })} placeholder="0.32" />
              </div>
              <div className="space-y-1">
                <Label>Second Deposit ($)</Label>
                <Input type="number" step="0.01" {...verifyForm.register("amount2", { valueAsNumber: true })} placeholder="0.45" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVerifyId(null)}>Cancel</Button>
              <Button type="submit" disabled={verifying}>{verifying ? "Verifying..." : "Verify Account"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
