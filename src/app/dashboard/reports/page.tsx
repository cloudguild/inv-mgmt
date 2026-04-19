"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatPercent, calcProjectedPayout } from "@/lib/utils";
import { api } from "@/lib/api";
import { Download } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface LendingPosition {
  id: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  project: { name: string; ragStatus: string };
}

interface Payout {
  id: string;
  date: string;
  amount: number;
  type: string;
  project?: { name: string };
}

export default function PartnerReportsPage() {
  const [positions, setPositions] = useState<LendingPosition[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [lRes] = await Promise.all([
        api.get("/api/dashboard/lender"),
      ]);
      if (lRes.ok) {
        const d = await lRes.json();
        setPositions(d.positions || []);
        setPayouts(d.recentPayouts || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalPrincipal = positions.reduce((s, p) => s + Number(p.principal), 0);
  const totalProjected = positions.reduce((s, p) =>
    s + calcProjectedPayout(Number(p.principal), Number(p.interestRate), p.startDate, p.maturityDate), 0);
  const totalReceived = payouts.reduce((s, p) => s + Number(p.amount), 0);

  const exportCSV = () => {
    const rows = positions.map(p => ({
      Project: p.project.name,
      Principal: Number(p.principal),
      Rate: `${Number(p.interestRate).toFixed(2)}%`,
      StartDate: formatDate(p.startDate),
      MaturityDate: formatDate(p.maturityDate),
      ProjectedPayout: calcProjectedPayout(Number(p.principal), Number(p.interestRate), p.startDate, p.maturityDate).toFixed(2),
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${r[h as keyof typeof r]}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "my-investments.csv"; a.click();
  };

  if (loading) {
    return (
      <AppLayout title="My Reports">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Reports">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Principal", value: formatCurrency(totalPrincipal) },
            { label: "Total Projected", value: formatCurrency(totalProjected) },
            { label: "Total Received", value: formatCurrency(totalReceived) },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-gray-500">{m.label}</p>
                <p className="text-xl font-bold mt-1">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Lending Positions</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-3 w-3 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {["Project", "Principal", "Rate", "Start", "Maturity", "Projected Payout"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {positions.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No positions.</td></tr>
                  ) : positions.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.project.name}</td>
                      <td className="px-4 py-3">{formatCurrency(p.principal)}</td>
                      <td className="px-4 py-3 text-green-700">{formatPercent(p.interestRate)}</td>
                      <td className="px-4 py-3">{formatDate(p.startDate)}</td>
                      <td className="px-4 py-3">{formatDate(p.maturityDate)}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700">
                        {formatCurrency(calcProjectedPayout(Number(p.principal), Number(p.interestRate), p.startDate, p.maturityDate))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {payouts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Payouts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {["Date", "Amount", "Type"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payouts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{formatDate(p.date)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 capitalize">{p.type.replace(/_/g, " ")}</td>
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
