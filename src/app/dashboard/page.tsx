"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuthStore } from "@/store/auth";
import { LenderDashboard } from "@/components/dashboard/lender-dashboard";
import { InvestorDashboard } from "@/components/dashboard/investor-dashboard";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { isLender, isInvestor, isAdmin, isPM } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lenderData, setLenderData] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [investorData, setInvestorData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const showLender = isLender();
  const showInvestor = isInvestor();
  const isAdminUser = isAdmin() || isPM();

  useEffect(() => {
    async function load() {
      if (showLender) {
        const res = await api.get("/api/dashboard/lender");
        if (res.ok) setLenderData(await res.json());
      }
      if (showInvestor) {
        const res = await api.get("/api/dashboard/investor");
        if (res.ok) setInvestorData(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [showLender, showInvestor]);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Dashboard">
      <div className="space-y-8">
        {showLender && lenderData && (
          <LenderDashboard data={lenderData} />
        )}
        {showInvestor && investorData && (
          <InvestorDashboard data={investorData} />
        )}
        {isAdminUser && !showLender && !showInvestor && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">Admin Dashboard</p>
            <p className="text-sm mt-1">Visit the <a href="/admin" className="text-blue-600 hover:underline">Admin Panel</a> to manage projects and users.</p>
          </div>
        )}
        {!showLender && !showInvestor && !isAdminUser && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No active investment positions found.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
