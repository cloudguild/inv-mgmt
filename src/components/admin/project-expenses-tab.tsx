"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const CATEGORIES = [
  "construction", "materials", "labor", "permits_legal",
  "architecture_design", "management_fees", "insurance", "other",
];

const expenseSchema = z.object({
  date: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  vendor: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  vendor: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  createdByUser: { name: string };
}

export function ProjectExpensesTab({ projectId }: { projectId: string; project: unknown }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: "construction" },
  });

  const load = async () => {
    const res = await api.get(`/api/projects/${projectId}/expenses`);
    if (res.ok) setExpenses(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const onSubmit = async (data: ExpenseForm) => {
    setAdding(true);
    const res = await api.post(`/api/projects/${projectId}/expenses`, data);
    if (res.ok) {
      await load();
      setAddOpen(false);
      reset();
    }
    setAdding(false);
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Expense
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {["Date", "Amount", "Category", "Vendor", "Invoice #", "Notes", "Added By"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No expenses recorded.</td></tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 capitalize">{e.category.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-gray-500">{e.vendor || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{e.invoiceNumber || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{e.notes || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{e.createdByUser.name}</td>
                    </tr>
                  ))
                )}
                {expenses.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-blue-700">{formatCurrency(total)}</td>
                    <td colSpan={5} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-red-600">{errors.date.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Amount ($) *</Label>
                <Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} placeholder="0.00" />
                {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select onValueChange={(v) => setValue("category", v)} defaultValue="construction">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Vendor / Payee</Label>
                <Input {...register("vendor")} placeholder="ABC Construction" />
              </div>
              <div className="space-y-1">
                <Label>Invoice #</Label>
                <Input {...register("invoiceNumber")} placeholder="INV-001" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea {...register("notes")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? "Adding..." : "Add Expense"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
