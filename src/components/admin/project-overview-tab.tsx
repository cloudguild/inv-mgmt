"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ProjectOverviewTabProps {
  project: {
    id: string;
    name: string;
    budget: number;
    progressPct: number;
    ragStatus: string;
    expenses?: Array<{ amount: number; category: string }>;
    payouts?: Array<{ amount: number }>;
    roles?: Array<{ role: string; user: { name: string } }>;
    milestones?: Array<{ id: string; name: string; targetDate: string; completedAt: string | null }>;
    lendingPositions?: Array<{ principal: number }>;
    equityPositions?: Array<{ amountInvested: number }>;
  };
  onUpdate: () => void;
}

export function ProjectOverviewTab({ project, onUpdate }: ProjectOverviewTabProps) {
  const [ragStatus, setRagStatus] = useState(project.ragStatus);
  const [updating, setUpdating] = useState(false);

  const totalExpenses = (project.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
  const totalPayouts = (project.payouts || []).reduce((s, p) => s + Number(p.amount), 0);
  const capitalRaised = [
    ...(project.lendingPositions || []).map((lp) => Number(lp.principal)),
    ...(project.equityPositions || []).map((ep) => Number(ep.amountInvested)),
  ].reduce((s, a) => s + a, 0);

  const partnerCount = new Set(
    (project.roles || [])
      .filter((r) => r.role === "lender" || r.role === "investor")
      .map((r) => r.user.name)
  ).size;

  const expenseByCategory = (project.expenses || []).reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(expenseByCategory).map(([cat, amount]) => ({
    name: cat.replace(/_/g, " "),
    amount,
  }));

  const nextMilestones = (project.milestones || [])
    .filter((m) => !m.completedAt)
    .slice(0, 3);

  const handleRagUpdate = async (newStatus: string) => {
    setUpdating(true);
    setRagStatus(newStatus);
    await api.put(`/api/projects/${project.id}`, { ragStatus: newStatus });
    setUpdating(false);
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Budget", value: formatCurrency(project.budget) },
          { label: "Capital Raised", value: formatCurrency(capitalRaised) },
          { label: "Expenses to Date", value: formatCurrency(totalExpenses) },
          { label: "Payouts Made", value: formatCurrency(totalPayouts) },
          { label: "Partner Count", value: partnerCount.toString() },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-lg font-bold mt-1">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress & RAG */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Overall Completion</span>
              <span className="font-semibold">{Number(project.progressPct).toFixed(0)}%</span>
            </div>
            <Progress value={Number(project.progressPct)} className="h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">RAG Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge
                variant={ragStatus === "green" ? "green" : ragStatus === "amber" ? "amber" : "red"}
                className="text-sm px-3 py-1"
              >
                {ragStatus === "green" ? "On Track" : ragStatus === "amber" ? "Some Concerns" : "At Risk"}
              </Badge>
              <Select value={ragStatus} onValueChange={handleRagUpdate} disabled={updating}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green — On Track</SelectItem>
                  <SelectItem value="amber">Amber — Concerns</SelectItem>
                  <SelectItem value="red">Red — At Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Expense Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Budget Utilisation by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Bar dataKey="amount" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Next Milestones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next 3 Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {nextMilestones.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming milestones.</p>
            ) : (
              <div className="space-y-3">
                {nextMilestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{m.name}</span>
                    <span className="text-xs text-gray-400">{formatDate(m.targetDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Partner Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Partner Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            {(project.roles || [])
              .filter((r, i, arr) => arr.findIndex((r2) => r2.user.name === r.user.name) === i)
              .filter((r) => r.role === "lender" || r.role === "investor")
              .slice(0, 6)
              .map((r, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <div className="h-7 w-7 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-medium">
                    {r.user.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.user.name}</p>
                    <p className="text-xs text-gray-500">{r.role}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
