"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const trackerSchema = z.object({
  title: z.string().min(1, "Title required"),
  updateType: z.enum(["issue", "milestone", "info"]),
  status: z.enum(["open", "resolved", "closed"]).optional(),
  notes: z.string().optional(),
  notifyPartners: z.boolean().optional(),
});

type TrackerForm = z.infer<typeof trackerSchema>;

interface TrackerUpdate {
  id: string;
  title: string;
  updateType: string;
  status: string;
  notes: string | null;
  notifyPartners: boolean;
  createdAt: string;
  createdByUser: { name: string };
}

const typeIcon = (type: string) => {
  if (type === "issue") return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (type === "milestone") return <CheckCircle className="h-4 w-4 text-green-500" />;
  return <Info className="h-4 w-4 text-blue-500" />;
};

const typeBadgeVariant = (type: string) => {
  if (type === "issue") return "danger" as const;
  if (type === "milestone") return "success" as const;
  return "default" as const;
};

const statusBadge = (status: string) => {
  if (status === "resolved") return "success" as const;
  if (status === "closed") return "secondary" as const;
  return "warning" as const;
};

export function ProjectTrackerTab({ projectId }: { projectId: string; project: unknown }) {
  const [updates, setUpdates] = useState<TrackerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TrackerForm>({
    resolver: zodResolver(trackerSchema),
    defaultValues: { updateType: "info", status: "open", notifyPartners: false },
  });

  const load = async () => {
    const res = await api.get(`/api/projects/${projectId}/tracker`);
    if (res.ok) setUpdates(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const onSubmit = async (data: TrackerForm) => {
    setAdding(true);
    const res = await api.post(`/api/projects/${projectId}/tracker`, data);
    if (res.ok) { await load(); setAddOpen(false); reset(); }
    setAdding(false);
  };

  const openIssues = updates.filter((u) => u.updateType === "issue" && u.status === "open").length;

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">Project Tracker</h3>
          {openIssues > 0 && (
            <Badge variant="danger">{openIssues} open issue{openIssues > 1 ? "s" : ""}</Badge>
          )}
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Update
        </Button>
      </div>

      <div className="space-y-3">
        {updates.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-gray-500">No updates yet.</CardContent></Card>
        ) : (
          updates.map((u) => (
            <Card key={u.id} className={`border-l-4 ${u.updateType === "issue" ? "border-l-red-500" : u.updateType === "milestone" ? "border-l-green-500" : "border-l-blue-500"}`}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    {typeIcon(u.updateType)}
                    <div>
                      <p className="font-medium text-sm">{u.title}</p>
                      {u.notes && <p className="text-sm text-gray-600 mt-1">{u.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        Posted by {u.createdByUser.name} · {formatDate(u.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={typeBadgeVariant(u.updateType)}>{u.updateType}</Badge>
                    <Badge variant={statusBadge(u.status)}>{u.status}</Badge>
                    {u.notifyPartners && <Badge variant="secondary">Notified</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Tracker Update</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input {...register("title")} placeholder="Foundation pour completed" />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type *</Label>
                <Select onValueChange={(v) => setValue("updateType", v as "issue" | "milestone" | "info")} defaultValue="info">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="issue">Issue</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status *</Label>
                <Select onValueChange={(v) => setValue("status", v as "open" | "resolved" | "closed")} defaultValue="open">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea {...register("notes")} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="notifyPartners" {...register("notifyPartners")} className="rounded" />
              <Label htmlFor="notifyPartners">Notify all partners of this update</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? "Adding..." : "Add Update"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
