"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const PAYOUT_TYPES = [
  "interest_payment", "principal_repayment", "profit_distribution",
  "partial_withdrawal", "final_payout",
];

const payoutSchema = z.object({
  date: z.string().min(1),
  amount: z.number().positive(),
  type: z.string().min(1),
  userId: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PayoutForm = z.infer<typeof payoutSchema>;

interface Payout {
  id: string;
  date: string;
  amount: number;
  type: string;
  reference: string | null;
  notes: string | null;
  user: { id: string; name: string; email: string };
  createdByUser: { name: string };
}

interface Partner {
  user: { id: string; name: string };
  roles: string[];
}

export function ProjectPayoutsTab({ projectId }: { projectId: string; project: unknown }) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PayoutForm>({
    resolver: zodResolver(payoutSchema),
  });

  const load = async () => {
    const [pr, pa] = await Promise.all([
      api.get(`/api/projects/${projectId}/payouts`).then(r => r.ok ? r.json() : []),
      api.get(`/api/projects/${projectId}/partners`).then(r => r.ok ? r.json() : []),
    ]);
    setPayouts(pr);
    setPartners(pa);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const onSubmit = async (data: PayoutForm) => {
    setAdding(true);
    const res = await api.post(`/api/projects/${projectId}/payouts`, data);
    if (res.ok) { await load(); setAddOpen(false); reset(); }
    setAdding(false);
  };

  const total = payouts.reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Total Payouts</p>
          <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Record Payout
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {["Date", "Recipient", "Amount", "Type", "Reference", "Notes"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No payouts recorded.</td></tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{formatDate(p.date)}</td>
                      <td className="px-4 py-3 font-medium">{p.user.name}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{p.type.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.reference || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{p.notes || "—"}</td>
                    </tr>
                  ))
                )}
                {payouts.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={2} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-blue-700">{formatCurrency(total)}</td>
                    <td colSpan={3} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payout</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" {...register("date")} />
              </div>
              <div className="space-y-1">
                <Label>Amount ($) *</Label>
                <Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Recipient *</Label>
              <Select onValueChange={(v) => setValue("userId", v)}>
                <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.user.id} value={p.user.id}>{p.user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.userId && <p className="text-xs text-red-600">Recipient required</p>}
            </div>
            <div className="space-y-1">
              <Label>Payout Type *</Label>
              <Select onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {PAYOUT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-600">Type required</p>}
            </div>
            <div className="space-y-1">
              <Label>Reference #</Label>
              <Input {...register("reference")} placeholder="REF-001" />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? "Recording..." : "Record Payout"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
