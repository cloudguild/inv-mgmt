"use client";
import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { Download, TrendingUp, DollarSign, Percent } from "lucide-react";

const YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => YEAR - i);

interface PartnerReport {
  summary: { totalLent: number; totalEquity: number; totalCapital: number; totalReceived: number };
  lendingPositions: Array<{
    id: string; principal: string; apr: string; startDate: string; maturityDate: string;
    status: string; projectedInterest: number; project: { name: string; ragStatus: string };
  }>;
  equityPositions: Array<{
    id: string; amountInvested: string; equitySharePct: string; projectedReturn: string | null;
    project: { name: string; ragStatus: string };
  }>;
  payouts: Array<{ id: string; date: string; amount: string; type: string; project: { name: string } }>;
  payoutsByYear: Record<string, number>;
  documents: Array<{ id: string; filename: string; docType: string; year: number | null; project: { name: string }; createdAt: string }>;
  transfers: Array<{ id: string; type: string; amount: string; status: string; description: string | null; createdAt: string; project: { name: string } }>;
}

export default function PartnerReportsPage() {
  const [year, setYear] = useState<string>("all");
  const [data, setData] = useState<PartnerReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = year !== "all" ? `?year=${year}` : "";
    const res = await api.get(`/api/reports/partner${q}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Date", "Project", "Type", "Amount"],
      ...(data.payouts ?? []).map((p) => [formatDate(p.date), p.project.name, p.type, p.amount]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `my-report-${year}.csv`;
    a.click();
  };

  if (loading) return (
    <AppLayout title="My Reports">
      <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>
    </AppLayout>
  );

  const payoutYearChart = Object.entries(data?.payoutsByYear ?? {}).map(([yr, val]) => ({ year: yr, amount: val })).sort((a, b) => a.year.localeCompare(b.year));

  const projectedTotal = (data?.lendingPositions ?? []).reduce((s, lp) => s + lp.projectedInterest, 0)
    + (data?.equityPositions ?? []).reduce((s, ep) => s + Number(ep.projectedReturn ?? 0), 0);

  return (
    <AppLayout title="My Reports">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Portfolio Report</h2>
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

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: DollarSign, label: "Total Capital Deployed", value: formatCurrency(data?.summary.totalCapital ?? 0) },
            { icon: TrendingUp, label: "Total Lending", value: formatCurrency(data?.summary.totalLent ?? 0) },
            { icon: Percent, label: "Total Equity", value: formatCurrency(data?.summary.totalEquity ?? 0) },
            { icon: DollarSign, label: "Total Received", value: formatCurrency(data?.summary.totalReceived ?? 0), highlight: true },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <k.icon className={`h-4 w-4 ${k.highlight ? "text-green-600" : "text-blue-600"}`} />
                  <p className="text-xs text-gray-500">{k.label}</p>
                </div>
                <p className={`text-xl font-bold ${k.highlight ? "text-green-700" : ""}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projected Returns */}
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Projected Total Returns</CardTitle>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(projectedTotal)}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>{["Project","Type","Principal / Invested","Rate / Share","Projected Return","Status"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {(data?.lendingPositions ?? []).map((lp) => (
                  <tr key={lp.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{lp.project.name}</td>
                    <td className="px-3 py-2"><Badge variant="secondary">Lending</Badge></td>
                    <td className="px-3 py-2 font-mono">{formatCurrency(Number(lp.principal))}</td>
                    <td className="px-3 py-2">{(Number(lp.apr) * 100).toFixed(2)}% APR</td>
                    <td className="px-3 py-2 font-mono text-blue-700">{formatCurrency(lp.projectedInterest)}</td>
                    <td className="px-3 py-2"><Badge variant={lp.status === "active" ? "success" : "secondary"}>{lp.status}</Badge></td>
                  </tr>
                ))}
                {(data?.equityPositions ?? []).map((ep) => (
                  <tr key={ep.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{ep.project.name}</td>
                    <td className="px-3 py-2"><Badge variant="default">Equity</Badge></td>
                    <td className="px-3 py-2 font-mono">{formatCurrency(Number(ep.amountInvested))}</td>
                    <td className="px-3 py-2">{Number(ep.equitySharePct).toFixed(2)}% equity</td>
                    <td className="px-3 py-2 font-mono text-blue-700">{ep.projectedReturn ? formatCurrency(Number(ep.projectedReturn)) : "—"}</td>
                    <td className="px-3 py-2"><Badge variant="secondary">active</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Year-over-year payouts */}
        {payoutYearChart.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Payouts Received by Year</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={payoutYearChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Bar dataKey="amount" name="Payouts Received" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Payout history */}
        {(data?.payouts ?? []).length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Payout History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 sticky top-0">
                    <tr>{["Date","Project","Type","Amount"].map((h) => <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data?.payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{formatDate(p.date)}</td>
                        <td className="px-3 py-2">{p.project.name}</td>
                        <td className="px-3 py-2 capitalize">{p.type.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 font-mono text-green-700">{formatCurrency(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {(data?.documents ?? []).length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">My Documents (K-1, 1099, etc.)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>{["Filename","Project","Type","Year","Date"].map((h) => <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data?.documents.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{d.filename}</td>
                      <td className="px-3 py-2">{d.project.name}</td>
                      <td className="px-3 py-2"><Badge variant="secondary">{d.docType}</Badge></td>
                      <td className="px-3 py-2 text-gray-500">{d.year ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Fund transfers */}
        {(data?.transfers ?? []).length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Fund Transfer History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>{["Date","Project","Type","Amount","Status"].map((h) => <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data?.transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{formatDate(t.createdAt)}</td>
                      <td className="px-3 py-2">{t.project.name}</td>
                      <td className="px-3 py-2 capitalize"><Badge variant={t.type === "deposit" ? "success" : "secondary"}>{t.type}</Badge></td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(Number(t.amount))}</td>
                      <td className="px-3 py-2 capitalize text-gray-500">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
