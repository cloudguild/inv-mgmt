"use client";
import { useEffect, useState, use, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";

const COLORS = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2"];
const YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => YEAR - i);

export default function ProjectReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [year, setYear] = useState<string>("all");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = year !== "all" ? `?year=${year}` : "";
    const res = await api.get(`/api/reports/project/${id}${q}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id, year]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const expenses = data.expenses as Array<{ date: string; category: string; amount: string; vendor?: string }>;
    const rows = [
      ["Date","Category","Amount","Vendor"],
      ...expenses.map((e) => [formatDate(e.date), e.category, e.amount, e.vendor ?? ""]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `project-report-${id}-${year}.csv`;
    a.click();
  };

  if (loading || !data) return (
    <AppLayout title="Project Report" requireAdminOrPM>
      <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>
    </AppLayout>
  );

  const project = data.project as { name: string; type: string; budget: number; progressPct: number; ragStatus: string };
  const summary = data.summary as { totalExpenses: number; totalPayouts: number; totalTransfersIn: number; totalTransfersOut: number; taskStats: { total: number; complete: number } };
  const expenseByCat = data.expenseByCategory as Record<string, number>;
  const expenses = data.expenses as Array<{ id: string; date: string; amount: string; category: string; vendor?: string; invoiceNumber?: string }>;
  const payouts = data.payouts as Array<{ id: string; date: string; amount: string; type: string; user: { name: string } }>;
  const vendors = data.vendors as Array<{ id: string; companyName: string; vendorType: string; totalPaid: number; docCount: number; txCount: number }>;
  const lenders = data.lenders as Array<{ id: string; principal: string; apr: string; user: { name: string; email: string } }>;
  const investors = data.investors as Array<{ id: string; amountInvested: string; equitySharePct: string; user: { name: string; email: string } }>;

  const catChartData = Object.entries(expenseByCat).map(([k, v]) => ({ name: k.replace(/_/g," "), value: v }));

  return (
    <AppLayout title={`${project.name} — Report`} requireAdminOrPM>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">{project.name}</h2>
            <Badge variant={project.ragStatus as "green"|"amber"|"red"}>{project.ragStatus.toUpperCase()}</Badge>
            <span className="text-sm text-gray-500 capitalize">{project.type} · {Number(project.progressPct).toFixed(0)}% complete</span>
          </div>
          <div className="flex gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3 w-3 mr-1" /> Export CSV</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Expenses", value: formatCurrency(summary.totalExpenses), color: "text-red-600" },
            { label: "Total Payouts", value: formatCurrency(summary.totalPayouts), color: "text-green-700" },
            { label: "Funds Received", value: formatCurrency(summary.totalTransfersIn), color: "text-blue-700" },
            { label: "Funds Sent Out", value: formatCurrency(summary.totalTransfersOut), color: "text-orange-600" },
            { label: "Tasks Complete", value: `${summary.taskStats.complete}/${summary.taskStats.total}`, color: "text-gray-700" },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {catChartData.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Expenses by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                      {catChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {vendors.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Vendor Payments</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={vendors.slice(0, 8).map((v) => ({ name: v.companyName.length > 12 ? v.companyName.slice(0,10)+"…" : v.companyName, paid: v.totalPaid }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Bar dataKey="paid" name="Total Paid" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Expenses table */}
        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Expense Detail</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 sticky top-0">
                  <tr>{["Date","Category","Amount","Vendor","Invoice"].map((h)=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{formatDate(e.date)}</td>
                      <td className="px-3 py-2 capitalize">{e.category.replace(/_/g," ")}</td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(Number(e.amount))}</td>
                      <td className="px-3 py-2 text-gray-500">{e.vendor ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-400">{e.invoiceNumber ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Partner tables */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Lenders ({lenders.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>{["Name","Principal","APR"].map((h)=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {lenders.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><div className="font-medium">{l.user.name}</div><div className="text-xs text-gray-400">{l.user.email}</div></td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(Number(l.principal))}</td>
                      <td className="px-3 py-2">{(Number(l.apr)*100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Investors ({investors.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>{["Name","Invested","Equity %"].map((h)=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {investors.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><div className="font-medium">{inv.user.name}</div><div className="text-xs text-gray-400">{inv.user.email}</div></td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(Number(inv.amountInvested))}</td>
                      <td className="px-3 py-2">{Number(inv.equitySharePct).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Payouts */}
        {payouts.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Payout History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 sticky top-0">
                    <tr>{["Date","Partner","Type","Amount"].map((h)=><th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{formatDate(p.date)}</td>
                        <td className="px-3 py-2 font-medium">{p.user.name}</td>
                        <td className="px-3 py-2 capitalize">{p.type.replace(/_/g," ")}</td>
                        <td className="px-3 py-2 font-mono text-green-700">{formatCurrency(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
