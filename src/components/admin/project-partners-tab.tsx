"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate, getInitials, calcDailyInterest } from "@/lib/utils";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Partner {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    lendingPositions: Array<{ id: string; principal: number; apr: number; maturityDate: string }>;
    equityPositions: Array<{ id: string; amountInvested: number; equitySharePct: number; projectedReturn: number | null }>;
    bankAccounts: Array<{ id: string; bankName: string; accountLast4: string; verificationStatus: string; isPrimary: boolean; nickname?: string }>;
    withdrawalRequests: Array<{ id: string; amount: number; type: string; status: string; createdAt: string }>;
  };
  roles: string[];
}

const verificationIcon = (status: string) => {
  if (status === "verified") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
};

const withdrawalStatusBadge = (status: string) => {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    completed: "success",
    pending: "warning",
    approved: "success",
    rejected: "danger",
    processing: "secondary",
  };
  return map[status] || "secondary";
};

export function ProjectPartnersTab({ projectId, project }: { projectId: string; project: unknown }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/projects/${projectId}/partners`).then(async (r) => {
      if (r.ok) setPartners(await r.json());
      setLoading(false);
    });
  }, [projectId]);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>;
  }

  return (
    <div className="space-y-4">
      {partners.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No partners on this project yet.</CardContent></Card>
      ) : (
        partners.map(({ user: u, roles }) => (
          <Card key={u.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{u.name}</CardTitle>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    <p className="text-xs text-gray-400">Joined {formatDate(u.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {roles.map((r) => (
                    <Badge key={r} variant="default">{r}</Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lender Position */}
              {u.lendingPositions.map((lp) => (
                <div key={lp.id} className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-2">LENDING POSITION</p>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Principal</p>
                      <p className="font-semibold">{formatCurrency(lp.principal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">APR</p>
                      <p className="font-semibold">{(Number(lp.apr) * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Daily Interest</p>
                      <p className="font-semibold">{formatCurrency(calcDailyInterest(Number(lp.principal), Number(lp.apr)))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Maturity</p>
                      <p className="font-semibold">{formatDate(lp.maturityDate)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Investor Position */}
              {u.equityPositions.map((ep) => (
                <div key={ep.id} className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-indigo-700 mb-2">EQUITY POSITION</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Invested</p>
                      <p className="font-semibold">{formatCurrency(ep.amountInvested)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Equity Share</p>
                      <p className="font-semibold">{Number(ep.equitySharePct).toFixed(2)}%</p>
                    </div>
                    {ep.projectedReturn && (
                      <div>
                        <p className="text-xs text-gray-500">Projected Return</p>
                        <p className="font-semibold">{formatCurrency(ep.projectedReturn)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Bank Accounts */}
              {u.bankAccounts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">BANK ACCOUNTS</p>
                  <div className="space-y-1">
                    {u.bankAccounts.map((ba) => (
                      <div key={ba.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                        <div className="flex items-center gap-2">
                          {verificationIcon(ba.verificationStatus)}
                          <span>{ba.bankName} ****{ba.accountLast4}</span>
                          {ba.nickname && <span className="text-gray-400">({ba.nickname})</span>}
                          {ba.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                        </div>
                        <Badge variant={ba.verificationStatus === "verified" ? "success" : ba.verificationStatus === "failed" ? "danger" : "warning"}>
                          {ba.verificationStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Withdrawal Requests */}
              {u.withdrawalRequests.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">WITHDRAWAL HISTORY</p>
                  <div className="space-y-1">
                    {u.withdrawalRequests.slice(0, 5).map((wr) => (
                      <div key={wr.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                        <div>
                          <span className="font-medium">{formatCurrency(wr.amount)}</span>
                          <span className="text-gray-400 ml-2 text-xs">{wr.type.replace(/_/g, " ")} · {formatDate(wr.createdAt)}</span>
                        </div>
                        <Badge variant={withdrawalStatusBadge(wr.status)}>{wr.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
