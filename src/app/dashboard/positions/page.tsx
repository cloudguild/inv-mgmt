"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPercent, calcProjectedPayout } from "@/lib/utils";
import { api } from "@/lib/api";
import { TrendingUp, Building2 } from "lucide-react";
import Link from "next/link";

interface LendingPosition {
  id: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  notes: string | null;
  project: { id: string; name: string; ragStatus: string; progressPct: number };
}

interface EquityPosition {
  id: string;
  amountInvested: number;
  equityPct: number;
  startDate: string;
  notes: string | null;
  project: { id: string; name: string; ragStatus: string; progressPct: number };
}

export default function PositionsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<{ positions: LendingPosition[]; equityPositions: EquityPosition[]; recommendedProjects: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [lRes, iRes] = await Promise.all([
        api.get("/api/dashboard/lender"),
        api.get("/api/dashboard/investor"),
      ]);
      const lData = lRes.ok ? await lRes.json() : { positions: [], recommendedProjects: [] };
      const iData = iRes.ok ? await iRes.json() : { equityPositions: [] };
      setData({ positions: lData.positions || [], equityPositions: iData.equityPositions || [], recommendedProjects: lData.recommendedProjects || [] });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <AppLayout title="My Investments">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      </AppLayout>
    );
  }

  const lendingPositions = data?.positions || [];
  const equityPositions = data?.equityPositions || [];
  const hasPositions = lendingPositions.length > 0 || equityPositions.length > 0;

  const totalLending = lendingPositions.reduce((s, p) => s + Number(p.principal), 0);
  const totalEquity = equityPositions.reduce((s, p) => s + Number(p.amountInvested), 0);

  return (
    <AppLayout title="My Investments">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">Lending Capital</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalLending)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">Equity Invested</p>
              <p className="text-xl font-bold text-violet-700 mt-1">{formatCurrency(totalEquity)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">Total Deployed</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(totalLending + totalEquity)}</p>
            </CardContent>
          </Card>
        </div>

        {!hasPositions ? (
          <Card>
            <CardContent className="py-16 text-center">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No investment positions found.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {lendingPositions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Lending Positions
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {lendingPositions.map((pos) => {
                    const projected = calcProjectedPayout(Number(pos.principal), Number(pos.interestRate), pos.startDate, pos.maturityDate);
                    return (
                      <Card key={pos.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{pos.project.name}</CardTitle>
                            <Badge variant={pos.project.ragStatus === "green" ? "green" : pos.project.ragStatus === "amber" ? "amber" : "red"}>
                              {pos.project.ragStatus.toUpperCase()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Principal</p>
                              <p className="font-semibold">{formatCurrency(pos.principal)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Rate</p>
                              <p className="font-semibold text-green-700">{formatPercent(pos.interestRate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Start Date</p>
                              <p>{formatDate(pos.startDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Maturity</p>
                              <p>{formatDate(pos.maturityDate)}</p>
                            </div>
                          </div>
                          <div className="bg-blue-50 rounded p-2 text-sm">
                            <p className="text-xs text-gray-500">Projected Total Payout</p>
                            <p className="font-bold text-blue-700">{formatCurrency(projected)}</p>
                          </div>
                          {pos.notes && <p className="text-xs text-gray-500">{pos.notes}</p>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {equityPositions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Equity Positions
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {equityPositions.map((pos) => (
                    <Card key={pos.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{pos.project.name}</CardTitle>
                          <Badge variant={pos.project.ragStatus === "green" ? "green" : pos.project.ragStatus === "amber" ? "amber" : "red"}>
                            {pos.project.ragStatus.toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Amount Invested</p>
                            <p className="font-semibold">{formatCurrency(pos.amountInvested)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Equity Share</p>
                            <p className="font-semibold text-violet-700">{Number(pos.equityPct).toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Start Date</p>
                            <p>{formatDate(pos.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Progress</p>
                            <p>{Number(pos.project.progressPct).toFixed(0)}%</p>
                          </div>
                        </div>
                        {pos.notes && <p className="text-xs text-gray-500">{pos.notes}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
