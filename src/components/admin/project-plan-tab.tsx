"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, ChevronDown, ChevronRight, Upload, Pencil, Trash2, Check, X } from "lucide-react";
import { parseFileToRows, parsePlanFile } from "@/lib/file-parsers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Task {
  id: string;
  name: string;
  assignedTo: string | null;
  dueDate: string | null;
  status: string;
}

interface Phase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  tasks: Task[];
}

const phaseSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

const taskSchema = z.object({
  name: z.string().min(1),
  dueDate: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "complete"]).optional(),
});

type PhaseForm = z.infer<typeof phaseSchema>;
type TaskForm = z.infer<typeof taskSchema>;

const statusBadge = (status: string) => {
  const map = { not_started: "secondary" as const, in_progress: "warning" as const, complete: "success" as const };
  return map[status as keyof typeof map] ?? "secondary" as const;
};

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.split("T")[0];
}

export function ProjectPlanTab({ projectId, onUpdate }: { projectId: string; project: unknown; onUpdate: () => void }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Phase editing state
  const [editPhaseId, setEditPhaseId] = useState<string | null>(null);
  const [editPhaseData, setEditPhaseData] = useState({ name: "", startDate: "", endDate: "" });
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);

  // Task editing state
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTaskData, setEditTaskData] = useState({ name: "", dueDate: "" });
  const [addTaskPhaseId, setAddTaskPhaseId] = useState<string | null>(null);

  // Import state
  const [importPreview, setImportPreview] = useState<ReturnType<typeof parsePlanFile> | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const phaseForm = useForm<PhaseForm>({ resolver: zodResolver(phaseSchema) });
  const taskForm = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: "not_started" },
  });

  const load = async () => {
    const res = await api.get(`/api/projects/${projectId}/phases`);
    if (res.ok) {
      const data = await res.json();
      setPhases(data);
      setExpanded(new Set(data.map((p: Phase) => p.id)));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  // ── Phase actions ──────────────────────────────────────────────
  const startEditPhase = (phase: Phase) => {
    setEditPhaseId(phase.id);
    setEditPhaseData({ name: phase.name, startDate: toDateInput(phase.startDate), endDate: toDateInput(phase.endDate) });
  };

  const savePhase = async (id: string) => {
    await api.patch(`/api/phases/${id}`, editPhaseData);
    setEditPhaseId(null);
    await load();
  };

  const deletePhase = async (id: string) => {
    if (!confirm("Delete this phase and all its tasks?")) return;
    await api.delete(`/api/phases/${id}`);
    await load();
    onUpdate();
  };

  const onAddPhase = async (data: PhaseForm) => {
    const res = await api.post(`/api/projects/${projectId}/phases`, data);
    if (res.ok) { await load(); setAddPhaseOpen(false); phaseForm.reset(); }
  };

  // ── Task actions ───────────────────────────────────────────────
  const startEditTask = (task: Task) => {
    setEditTaskId(task.id);
    setEditTaskData({ name: task.name, dueDate: toDateInput(task.dueDate) });
  };

  const saveTask = async (id: string) => {
    await api.patch(`/api/tasks/${id}`, { name: editTaskData.name, dueDate: editTaskData.dueDate || null });
    setEditTaskId(null);
    await load();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await api.delete(`/api/tasks/${id}`);
    await load();
    onUpdate();
  };

  const onTaskStatusChange = async (taskId: string, status: string) => {
    await api.patch(`/api/tasks/${taskId}`, { status });
    await load();
    onUpdate();
  };

  const onAddTask = async (phaseId: string, data: TaskForm) => {
    const res = await api.post(`/api/phases/${phaseId}/tasks`, data);
    if (res.ok) { await load(); setAddTaskPhaseId(null); taskForm.reset(); }
  };

  // ── Import ─────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const rows = await parseFileToRows(file);
      const parsed = parsePlanFile(rows);
      setImportPreview(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to parse file.");
    }
    e.target.value = "";
  };

  const handleImportConfirm = async (replace: boolean) => {
    if (!importPreview) return;
    setImporting(true);
    const res = await api.post(`/api/projects/${projectId}/phases/import`, { phases: importPreview, replace });
    if (res.ok) { await load(); setImportPreview(null); }
    else setImportError("Import failed. Please try again.");
    setImporting(false);
  };

  const togglePhase = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-gray-50 cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> Import CSV / XLSX
            </span>
          </label>
          {importError && <p className="text-sm text-red-600">{importError}</p>}
        </div>
        <Button onClick={() => setAddPhaseOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Phase
        </Button>
      </div>

      {/* Import preview dialog */}
      <Dialog open={!!importPreview} onOpenChange={(o) => { if (!o) setImportPreview(null); }}>
        <DialogContent className="max-w-2xl max-h-[75vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preview Import</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Found <strong>{importPreview?.length ?? 0} phases</strong> with{" "}
              <strong>{importPreview?.reduce((s, p) => s + p.tasks.length, 0) ?? 0} tasks</strong>.
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-3">
              {importPreview?.map((phase, i) => (
                <div key={i} className="text-sm">
                  <p className="font-semibold">
                    {phase.name}
                    {phase.startDate && <span className="font-normal text-gray-400 ml-2">{phase.startDate} – {phase.endDate}</span>}
                  </p>
                  {phase.tasks.length > 0 && (
                    <ul className="ml-4 mt-0.5 space-y-0.5 text-gray-600 list-disc">
                      {phase.tasks.map((t, j) => (
                        <li key={j}>{t.name}{t.dueDate && <span className="text-gray-400 ml-1">due {t.dueDate}</span>}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setImportPreview(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleImportConfirm(false)} disabled={importing}>Append to existing plan</Button>
            <Button onClick={() => handleImportConfirm(true)} disabled={importing} className="bg-orange-600 hover:bg-orange-700">Replace existing plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phases */}
      {phases.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No phases defined. Add the first phase to get started.</CardContent></Card>
      ) : (
        phases.map((phase) => {
          const completed = phase.tasks.filter((t) => t.status === "complete").length;
          const isExpanded = expanded.has(phase.id);
          const isEditing = editPhaseId === phase.id;

          return (
            <Card key={phase.id}>
              <CardHeader className="pb-3">
                {isEditing ? (
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex-1 min-w-48">
                      <Label className="text-xs">Phase Name</Label>
                      <Input
                        value={editPhaseData.name}
                        onChange={(e) => setEditPhaseData((d) => ({ ...d, name: e.target.value }))}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={editPhaseData.startDate}
                        onChange={(e) => setEditPhaseData((d) => ({ ...d, startDate: e.target.value }))}
                        className="h-8 text-sm w-36"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={editPhaseData.endDate}
                        onChange={(e) => setEditPhaseData((d) => ({ ...d, endDate: e.target.value }))}
                        className="h-8 text-sm w-36"
                      />
                    </div>
                    <div className="flex gap-1 pb-0.5">
                      <Button size="sm" className="h-8 w-8 p-0" onClick={() => savePhase(phase.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setEditPhaseId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => togglePhase(phase.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                      <CardTitle className="text-base">{phase.name}</CardTitle>
                      <Badge variant={statusBadge(phase.status)}>{phase.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
                      <span className="hidden sm:inline">{formatDate(phase.startDate)} – {formatDate(phase.endDate)}</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                        {completed}/{phase.tasks.length}
                      </span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditPhase(phase)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => deletePhase(phase.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {phase.tasks.map((task) => {
                      const isEditingTask = editTaskId === task.id;
                      return (
                        <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded group">
                          {isEditingTask ? (
                            <>
                              <Input
                                value={editTaskData.name}
                                onChange={(e) => setEditTaskData((d) => ({ ...d, name: e.target.value }))}
                                className="h-7 text-sm flex-1"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") saveTask(task.id); if (e.key === "Escape") setEditTaskId(null); }}
                              />
                              <Input
                                type="date"
                                value={editTaskData.dueDate}
                                onChange={(e) => setEditTaskData((d) => ({ ...d, dueDate: e.target.value }))}
                                className="h-7 text-sm w-36"
                              />
                              <Button size="sm" className="h-7 w-7 p-0" onClick={() => saveTask(task.id)}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setEditTaskId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                checked={task.status === "complete"}
                                onChange={(e) => onTaskStatusChange(task.id, e.target.checked ? "complete" : "in_progress")}
                                className="rounded flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${task.status === "complete" ? "line-through text-gray-400" : "text-gray-700"}`}>
                                  {task.name}
                                </p>
                                {task.dueDate && <p className="text-xs text-gray-400">Due {formatDate(task.dueDate)}</p>}
                              </div>
                              <Badge variant={statusBadge(task.status)} className="hidden sm:flex text-xs">
                                {task.status.replace(/_/g, " ")}
                              </Badge>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEditTask(task)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => deleteTask(task.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {addTaskPhaseId === phase.id ? (
                      <form onSubmit={taskForm.handleSubmit((d) => onAddTask(phase.id, d))} className="flex items-end gap-2 pt-2">
                        <div className="flex-1">
                          <Input placeholder="Task name" {...taskForm.register("name")} className="h-8 text-sm" autoFocus />
                        </div>
                        <Input type="date" className="w-36 h-8 text-sm" {...taskForm.register("dueDate")} />
                        <Button type="submit" size="sm">Add</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setAddTaskPhaseId(null)}>Cancel</Button>
                      </form>
                    ) : (
                      <Button variant="ghost" size="sm" className="mt-1 text-blue-600" onClick={() => setAddTaskPhaseId(phase.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Task
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {/* Add Phase form */}
      {addPhaseOpen && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Phase</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={phaseForm.handleSubmit(onAddPhase)} className="space-y-3">
              <div className="space-y-1">
                <Label>Phase Name *</Label>
                <Input {...phaseForm.register("name")} placeholder="Foundation & Excavation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date *</Label>
                  <Input type="date" {...phaseForm.register("startDate")} />
                </div>
                <div className="space-y-1">
                  <Label>End Date *</Label>
                  <Input type="date" {...phaseForm.register("endDate")} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Phase</Button>
                <Button type="button" variant="outline" onClick={() => setAddPhaseOpen(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
