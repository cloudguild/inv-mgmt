"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { Star, PieChart } from "lucide-react";
import Link from "next/link";

interface EquityPosition {
  id: string;
  amountInvested: number;
  equitySharePct: number;
  projectedReturn: number | null;
  project: {
    id: string;
    name: string;
    description: string;
    progressPct: number;
    ragStatus: string;
    milestones: Array<{ id: string; name: string; targetDate: string; completedAt: string | null }>;
  };
}

interface RecommendedProject {
  id: string;
  name: string;
  description: string;
  targetReturn: number;
  startDate: string;
  endDate: string;
}

interface InvestorDashboardProps {
  data: {
    positions: EquityPosition[];
    recommendedProjects: RecommendedProject[];
  };
}

const ragConfig = {
  green: { label: "On Track", variant: "green" as const },
  amber: { label: "Some Concerns", variant: "amber" as const },
  red: { label: "At Risk", variant: "red" as const },
};

export function InvestorDashboard({ data }: InvestorDashboardProps) {
  const { positions, recommendedProjects } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Equity Positions</h2>
        {positions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No active equity positions.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {positions.map((pos) => {
              const rag = ragConfig[pos.project.ragStatus as keyof typeof ragConfig] || ragConfig.green;
              const upcomingMilestones = pos.project.milestones
                .filter((m) => !m.completedAt)
                .slice(0, 3);

              return (
                <Card key={pos.id} className="overflow-hidden">
                  <CardHeader className="bg-indigo-50 border-b pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{pos.project.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{pos.project.description}</p>
                      </div>
                      <Badge variant={rag.variant}>{rag.label}</Badge>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Project Progress</span>
                        <span>{Number(pos.project.progressPct).toFixed(0)}%</span>
                      </div>
                      <Progress value={Number(pos.project.progressPct)} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <PieChart className="h-3 w-3" />
                          Equity Share
                        </div>
                        <p className="font-semibold text-gray-900">{formatPercent(Number(pos.equitySharePct))}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Amount Invested</div>
                        <p className="font-semibold text-gray-900">{formatCurrency(pos.amountInvested)}</p>
                      </div>
                      {pos.projectedReturn && (
                        <div className="bg-indigo-50 rounded-lg p-3 col-span-2">
                          <div className="text-xs text-gray-500 mb-1">Projected Total Return</div>
                          <p className="font-semibold text-indigo-700">{formatCurrency(pos.projectedReturn)}</p>
                        </div>
                      )}
                    </div>

                    {upcomingMilestones.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Upcoming Milestones</p>
                        <div className="space-y-1">
                          {upcomingMilestones.map((m) => (
                            <div key={m.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{m.name}</span>
                              <span className="text-gray-400 text-xs">{formatDate(m.targetDate)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Link href="/dashboard/withdrawals" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">Withdraw</Button>
                      </Link>
                      <Link href="/dashboard/documents" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">Documents</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {recommendedProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Recommended Projects
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {recommendedProjects.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-gray-600 line-clamp-2">{p.description}</p>
                  {p.targetReturn && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Target Return</span>
                      <span className="font-semibold text-indigo-700">{formatPercent(Number(p.targetReturn))}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </div>
                  <Button size="sm" className="w-full mt-2">Learn More</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
