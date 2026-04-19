"use client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import Link from "next/link";
import { Plus, Search, Archive, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  budget: number;
  targetReturn: number | null;
  startDate: string;
  endDate: string;
  progressPct: number;
  ragStatus: string;
  isRecommended: boolean;
  isArchived: boolean;
}

const projectSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  type: z.enum(["lending", "equity", "both"]),
  budget: z.number().positive("Budget must be positive"),
  targetReturn: z.number().optional(),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  ragStatus: z.enum(["green", "amber", "red"]),
  isRecommended: z.boolean(),
});

type ProjectForm = z.infer<typeof projectSchema>;

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { type: "lending", ragStatus: "green", isRecommended: false },
  });

  useEffect(() => {
    api.get(`/api/projects?archived=${showArchived}`).then(async (r) => {
      if (r.ok) setProjects(await r.json());
      setLoading(false);
    });
  }, [showArchived]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = async (data: ProjectForm) => {
    setCreating(true);
    const res = await api.post("/api/projects", data);
    if (res.ok) {
      const created = await res.json();
      setProjects((prev) => [created, ...prev]);
      setCreateOpen(false);
      reset();
    }
    setCreating(false);
  };

  const ragBadge = (status: string) => {
    const map = { green: "green", amber: "amber", red: "red" } as const;
    return map[status as keyof typeof map] || "secondary";
  };

  return (
    <AppLayout title="Projects" requireAdminOrPM>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4 mr-1" />
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Project
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No projects found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <Card key={p.id} className={p.isArchived ? "opacity-60" : ""}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{p.type} · {formatDate(p.startDate)} – {formatDate(p.endDate)}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Badge variant={ragBadge(p.ragStatus)}>{p.ragStatus.toUpperCase()}</Badge>
                      {p.isArchived && <Badge variant="secondary">Archived</Badge>}
                      {p.isRecommended && <Badge variant="warning">⭐</Badge>}
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{Number(p.progressPct).toFixed(0)}%</span>
                    </div>
                    <Progress value={Number(p.progressPct)} />
                  </div>

                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="font-semibold">{formatCurrency(p.budget)}</p>
                    </div>
                    {p.targetReturn && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Target Return</p>
                        <p className="font-semibold text-blue-700">{Number(p.targetReturn).toFixed(1)}%</p>
                      </div>
                    )}
                  </div>

                  <Link href={`/admin/projects/${p.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Project Hub
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Project Name *</Label>
              <Input {...register("name")} placeholder="Riverside Condos Phase 1" />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea {...register("description")} placeholder="Brief project description..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type *</Label>
                <Select onValueChange={(v) => setValue("type", v as "lending" | "equity" | "both")} defaultValue="lending">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lending">Lending</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>RAG Status *</Label>
                <Select onValueChange={(v) => setValue("ragStatus", v as "green" | "amber" | "red")} defaultValue="green">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">Green — On Track</SelectItem>
                    <SelectItem value="amber">Amber — Some Concerns</SelectItem>
                    <SelectItem value="red">Red — At Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Total Budget ($) *</Label>
                <Input type="number" {...register("budget", { valueAsNumber: true })} placeholder="5000000" />
                {errors.budget && <p className="text-xs text-red-600">{errors.budget.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Target Return (%)</Label>
                <Input type="number" step="0.01" {...register("targetReturn", { valueAsNumber: true })} placeholder="12.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date *</Label>
                <Input type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-red-600">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>End Date *</Label>
                <Input type="date" {...register("endDate")} />
                {errors.endDate && <p className="text-xs text-red-600">{errors.endDate.message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isRecommended" {...register("isRecommended")} className="rounded" />
              <Label htmlFor="isRecommended">Mark as Recommended for investors</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Project"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
