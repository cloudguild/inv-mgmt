"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { ProjectOverviewTab } from "@/components/admin/project-overview-tab";
import { ProjectPartnersTab } from "@/components/admin/project-partners-tab";
import { ProjectVendorsTab } from "@/components/admin/project-vendors-tab";
import { ProjectPlanTab } from "@/components/admin/project-plan-tab";
import { ProjectFinancialTab } from "@/components/admin/project-financial-tab";
import { ProjectExpensesTab } from "@/components/admin/project-expenses-tab";
import { ProjectPayoutsTab } from "@/components/admin/project-payouts-tab";
import { ProjectTrackerTab } from "@/components/admin/project-tracker-tab";
import { ProjectDocumentsTab } from "@/components/admin/project-documents-tab";
import { Badge } from "@/components/ui/badge";

interface ProjectData {
  id: string;
  name: string;
  description: string;
  type: string;
  budget: number;
  progressPct: number;
  ragStatus: string;
  trackerUpdates: Array<{ id: string; status: string; updateType: string }>;
  [key: string]: unknown;
}

export default function ProjectHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAdmin, isPM } = useAuthStore();
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const loadProject = async () => {
    try {
      const res = await api.get(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (!isAdmin() && isPM() && !isPM(id)) {
          router.replace("/admin/projects");
          return;
        }
        setProject(data);
      }
    } catch (e) {
      console.error("Failed to load project", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProject(); }, [id]);

  if (loading) {
    return (
      <AppLayout title="Project Hub">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout title="Project Hub">
        <div className="flex items-center justify-center h-64 text-gray-500">
          Project not found or you don&apos;t have access.
        </div>
      </AppLayout>
    );
  }

  const openIssues = project.trackerUpdates.filter(
    (u: { status: string; updateType: string }) => u.status === "open" && u.updateType === "issue"
  ).length;

  const ragConfig = {
    green: "green",
    amber: "amber",
    red: "red",
  } as const;

  return (
    <AppLayout title={project.name}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant={ragConfig[project.ragStatus as keyof typeof ragConfig]}>
            {project.ragStatus.toUpperCase()}
          </Badge>
          <span className="text-sm text-gray-500">{project.type} · {Number(project.progressPct).toFixed(0)}% complete</span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="plan">Project Plan</TabsTrigger>
            <TabsTrigger value="financial">Financial Model</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="tracker" className="relative">
              Tracker
              {openIssues > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{openIssues}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="overview">
              <ProjectOverviewTab project={project} onUpdate={loadProject} />
            </TabsContent>
            <TabsContent value="partners">
              <ProjectPartnersTab projectId={id} project={project} />
            </TabsContent>
            <TabsContent value="vendors">
              <ProjectVendorsTab projectId={id} />
            </TabsContent>
            <TabsContent value="plan">
              <ProjectPlanTab projectId={id} project={project} onUpdate={loadProject} />
            </TabsContent>
            <TabsContent value="financial">
              <ProjectFinancialTab projectId={id} project={project} />
            </TabsContent>
            <TabsContent value="expenses">
              <ProjectExpensesTab projectId={id} project={project} />
            </TabsContent>
            <TabsContent value="payouts">
              <ProjectPayoutsTab projectId={id} project={project} />
            </TabsContent>
            <TabsContent value="documents">
              <ProjectDocumentsTab projectId={id} />
            </TabsContent>
            <TabsContent value="tracker">
              <ProjectTrackerTab projectId={id} project={project} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
