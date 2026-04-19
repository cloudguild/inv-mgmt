"use client";
import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, TrendingUp, Users, Building2, DollarSign } from "lucide-react";

const COLORS = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2","#be185d","#65a30d"];
const YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => YEAR - i);

interface AdminReport {
  summary: { totalProjects: number; totalCapitalDeployed: number; totalExpenses: number; totalPayouts: number; totalLenders: number; totalInvestors: number };
  projects: Array<{ id: string; name: string; type: string; budget: number; progressPct: number; ragStatus: string; totalExpenses: number; totalPayouts: number; _count: { lendingPositions: number; equityPositions: number; vendors: number } }>;
  expensesByCategory: Array<{ category: string; _sum: { amount: string } }>;
  lendingPositions: Array<{ principal: string; project: { name: string } }>;
  equityPositions: Array<{ amountInvested: string; project: { name: string } }>;
}

function KPI({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card><CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-2 mb-1"><Icon className="h-4 w-4 text-blue-600" /><p className="text-xs text-gray-500">{label}</p></div>
      <p className="text-xl font-bold">{value}</p>
    </CardContent></Card>
  );
}

export default function AdminReportsPage() {
  const [year, setYear] = useState<string>("all");
  const [data, setData] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = year !== "all" ? `?year=${year}` : "";
    const res = await api.get(`/api/reports/admin${q}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Project","Type","Budget","Progress","RAG","Expenses","Payouts","Lenders","Investors"],
      ...data.projects.map((p) => [p.name,p.type,p.budget,`${p.progressPct}%`,p.ragStatus,p.totalExpenses,p.totalPayouts,p._count.lendingPositions,p._count.equityPositions]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `admin-report-${year}.csv`;
    a.click();
  };

  if (loading) return <AppLayout title="Admin Reports" requireAdmin><div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div></AppLayout>;

  const expenseChartData = data?.expensesByCategory.map((e) => ({ name: e.category.replace(/_/g," "), value: parseFloat(String(e._sum.amount ?? 0)) })) ?? [];
  const projectChartData = data?.projects.map((p) => ({ name: p.name.length > 14 ? p.name.slice(0,12)+"…" : p.name, expenses: p.totalExpenses, payouts: p.totalPayouts })) ?? [];
  const capitalByProject = [...(data?.lendingPositions.map((lp) => ({ name: lp.project.name, value: parseFloat(String(lp.principal)) })) ?? []),...(data?.equityPositions.map((ep) => ({ name: ep.project.name, value: parseFloat(String(ep.amountInvested)) })) ?? [])].reduce<Record<string,number>>((acc,item) => { acc[item.name]=(acc[item.name]??0)+item.value; return acc; }, {});

  return (
    <AppLayout title="Admin Reports" requireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Cross-Portfolio Report</h2>
          <div className="flex items-center gap-2">
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPI icon={Building2} label="Projects" value={String(data?.summary.totalProjects ?? 0)} />
          <KPI icon={DollarSign} label="Capital Deployed" value={formatCurrency(data?.summary.totalCapitalDeployed ?? 0)} />
          <KPI icon={TrendingUp} label="Total Expenses" value={formatCurrency(data?.summary.totalExpenses ?? 0)} />
          <KPI icon={DollarSign} label="Total Payouts" value={formatCurrency(data?.summary.totalPayouts ?? 0)} />
          <KPI icon={Users} label="Lenders" value={String(data?.summary.totalLenders ?? 0)} />
          <KPI icon={Users} label="Investors" value={String(data?.summary.totalInvestors ?? 0)} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Expenses by Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ percent }) => `${((percent ?? 0)*100).toFixed(0)}%`}>
                    {expenseChartData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Capital by Project</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={Object.entries(capitalByProject).map(([name,value])=>({name,value}))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {Object.keys(capitalByProject).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Expenses vs Payouts by Project</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={projectChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Legend />
                <Bar dataKey="expenses" name="Expenses" fill="#dc2626" />
                <Bar dataKey="payouts" name="Payouts" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Project Summary Table</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>{["Project","Type","RAG","Progress","Budget","Expenses","Payouts","Lenders","Investors","Vendors"].map((h)=>(
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {data?.projects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 capitalize">{p.type}</td>
                      <td className="px-3 py-2"><Badge variant={p.ragStatus as "green"|"amber"|"red"}>{p.ragStatus.toUpperCase()}</Badge></td>
                      <td className="px-3 py-2">{Number(p.progressPct).toFixed(0)}%</td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(Number(p.budget))}</td>
                      <td className="px-3 py-2 font-mono text-red-600">{formatCurrency(p.totalExpenses)}</td>
                      <td className="px-3 py-2 font-mono text-green-700">{formatCurrency(p.totalPayouts)}</td>
                      <td className="px-3 py-2 text-center">{p._count.lendingPositions}</td>
                      <td className="px-3 py-2 text-center">{p._count.equityPositions}</td>
                      <td className="px-3 py-2 text-center">{p._count.vendors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
