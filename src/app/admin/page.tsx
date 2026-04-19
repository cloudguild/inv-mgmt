"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  Building2, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  type: string;
  budget: number;
  progressPct: number;
  ragStatus: string;
  isArchived: boolean;
  _count?: { roles: number };
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  user: { name: string };
  project: { name: string };
  createdAt: string;
}

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/projects").then(r => r.ok ? r.json() : []),
      api.get("/api/withdrawals?status=pending").then(r => r.ok ? r.json() : []),
    ]).then(([p, w]) => {
      setProjects(p);
      setWithdrawals(w);
      setLoading(false);
    });
  }, []);

  const activeProjects = projects.filter((p) => !p.isArchived);
  const totalBudget = activeProjects.reduce((s, p) => s + Number(p.budget), 0);

  const ragCounts = activeProjects.reduce(
    (acc, p) => { acc[p.ragStatus] = (acc[p.ragStatus] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <AppLayout title="Admin Overview" requireAdminOrPM>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Admin Overview" requireAdminOrPM>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Projects</p>
                  <p className="text-2xl font-bold">{activeProjects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Withdrawals</p>
                  <p className="text-2xl font-bold">{withdrawals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">At Risk</p>
                  <p className="text-2xl font-bold">{ragCounts.red || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Link href="/admin/projects">
                  <Button size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {activeProjects.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No active projects.</p>
                ) : (
                  <div className="space-y-3">
                    {activeProjects.slice(0, 5).map((p) => (
                      <Link key={p.id} href={`/admin/projects/${p.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer transition-colors">
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(p.budget)} budget</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">{Number(p.progressPct).toFixed(0)}% complete</p>
                            </div>
                            <Badge
                              variant={p.ragStatus === "green" ? "green" : p.ragStatus === "amber" ? "amber" : "red"}
                            >
                              {p.ragStatus.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pending Withdrawals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending Approvals</CardTitle>
              <Link href="/admin/withdrawals">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">All clear!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawals.slice(0, 5).map((w) => (
                    <div key={w.id} className="p-3 border border-amber-100 bg-amber-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{w.user.name}</p>
                          <p className="text-xs text-gray-500">{w.project.name}</p>
                        </div>
                        <p className="font-semibold text-sm">{formatCurrency(w.amount)}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(w.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RAG Summary */}
        <Card>
          <CardHeader>
            <CardTitle>RAG Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">{ragCounts.green || 0} On Track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-gray-600">{ragCounts.amber || 0} Some Concerns</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">{ragCounts.red || 0} At Risk</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
