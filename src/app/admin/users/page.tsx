"use client";
import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Plus, Search, UserCheck, UserX, Pencil, ChevronRight, Trash2, AlertTriangle } from "lucide-react";

interface Project { id: string; name: string }
interface RoleRow { id: string; role: string; project: { id: string; name: string } | null }
interface LendingPos { id: string; principal: number; apr: number; startDate: string; maturityDate: string; notes: string | null; projectId: string }
interface EquityPos { id: string; amountInvested: number; equitySharePct: number; projectedReturn: number | null; notes: string | null; projectId: string }
interface User {
  id: string; name: string; email: string; phone: string | null;
  isActive: boolean; createdAt: string;
  roles: RoleRow[];
  lendingPositions?: LendingPos[];
  equityPositions?: EquityPos[];
  _count?: { lendingPositions: number; equityPositions: number };
}

type WizardStep = 1 | 2 | 3;

const ROLE_COLORS: Record<string, "default" | "success" | "warning" | "secondary" | "danger"> = {
  admin: "default", pm: "warning", lender: "success", investor: "secondary",
};

// ─── Add User Wizard ─────────────────────────────────────────────────────────

function AddUserDialog({
  open, onClose, onCreated, projects, isAdminUser,
}: {
  open: boolean; onClose: () => void; onCreated: () => void;
  projects: Project[]; isAdminUser: boolean;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [role, setRole] = useState<"admin" | "pm" | "lender" | "investor">("lender");
  const [projectId, setProjectId] = useState("");

  // Step 3 — lender
  const [principal, setPrincipal] = useState("");
  const [apr, setApr] = useState("");
  const [startDate, setStartDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [lenderNotes, setLenderNotes] = useState("");

  // Step 3 — investor
  const [amountInvested, setAmountInvested] = useState("");
  const [equitySharePct, setEquitySharePct] = useState("");
  const [projectedReturn, setProjectedReturn] = useState("");
  const [investorNotes, setInvestorNotes] = useState("");

  const reset = () => {
    setStep(1); setError("");
    setName(""); setEmail(""); setPhone(""); setPassword("");
    setRole("lender"); setProjectId("");
    setPrincipal(""); setApr(""); setStartDate(""); setMaturityDate(""); setLenderNotes("");
    setAmountInvested(""); setEquitySharePct(""); setProjectedReturn(""); setInvestorNotes("");
  };

  const close = () => { reset(); onClose(); };

  const needsProject = role === "pm" || role === "lender" || role === "investor";
  const needsStep3 = role === "lender" || role === "investor";

  const totalSteps = needsStep3 ? 3 : 2;

  const canNext1 = name.trim() && email.trim().includes("@");
  const canNext2 = role === "admin" || (needsProject && projectId);

  const submit = async () => {
    setSaving(true); setError("");
    const body: Record<string, unknown> = { name, email, phone, password, role, projectId: projectId || null };
    if (role === "lender") {
      body.lenderData = { principal: parseFloat(principal), apr: parseFloat(apr) / 100, startDate, maturityDate, notes: lenderNotes };
    }
    if (role === "investor") {
      body.investorData = { amountInvested: parseFloat(amountInvested), equitySharePct: parseFloat(equitySharePct), projectedReturn: projectedReturn ? parseFloat(projectedReturn) : null, notes: investorNotes };
    }
    const res = await api.post("/api/users", body);
    if (res.ok) { onCreated(); close(); }
    else { const d = await res.json(); setError(d.error || "Failed to create user"); }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add User — Step {step} of {totalSteps}</DialogTitle>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-blue-600" : "bg-gray-200"}`} />
            ))}
          </div>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-1">
              <Label>Password <span className="text-gray-400 font-normal">(leave blank → ChangeMe123!)</span></Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!canNext1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select value={role} onValueChange={(v) => { setRole(v as typeof role); setProjectId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isAdminUser && <SelectItem value="admin">Admin</SelectItem>}
                  <SelectItem value="pm">Project Manager (PM)</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="investor">Equity Investor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {needsProject && (
              <div className="space-y-1">
                <Label>Project *</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded bg-blue-50 p-3 text-xs text-blue-700 space-y-1">
              {role === "pm" && <p>PM can manage users, expenses, payouts, and project plan for the assigned project.</p>}
              {role === "lender" && <p>Lender will be onboarded with a lending position (principal, APR, term) in the next step.</p>}
              {role === "investor" && <p>Investor will be onboarded with an equity position (amount, share %) in the next step.</p>}
              {role === "admin" && <p>Admin has full access across all projects.</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              {needsStep3 ? (
                <Button onClick={() => setStep(3)} disabled={!canNext2}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={saving || !canNext2}>
                  {saving ? "Creating…" : "Create User"}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

        {step === 3 && role === "lender" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">Lending Position Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Principal ($) *</Label>
                <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="500000" />
              </div>
              <div className="space-y-1">
                <Label>Interest Rate (% APR) *</Label>
                <Input type="number" step="0.1" value={apr} onChange={(e) => setApr(e.target.value)} placeholder="8.5" />
              </div>
              <div className="space-y-1">
                <Label>Start Date *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Maturity Date *</Label>
                <Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={lenderNotes} onChange={(e) => setLenderNotes(e.target.value)} placeholder="Optional notes" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={submit} disabled={saving || !principal || !apr || !startDate || !maturityDate}>
                {saving ? "Creating…" : "Create Lender"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && role === "investor" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">Equity Position Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount Invested ($) *</Label>
                <Input type="number" value={amountInvested} onChange={(e) => setAmountInvested(e.target.value)} placeholder="250000" />
              </div>
              <div className="space-y-1">
                <Label>Equity Share (%) *</Label>
                <Input type="number" step="0.1" value={equitySharePct} onChange={(e) => setEquitySharePct(e.target.value)} placeholder="15.5" />
              </div>
              <div className="space-y-1">
                <Label>Projected Return ($)</Label>
                <Input type="number" value={projectedReturn} onChange={(e) => setProjectedReturn(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={investorNotes} onChange={(e) => setInvestorNotes(e.target.value)} placeholder="Optional notes" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={submit} disabled={saving || !amountInvested || !equitySharePct}>
                {saving ? "Creating…" : "Create Investor"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────

function EditUserDialog({
  user, open, onClose, onSaved, onDeleted, projects, isAdminUser,
}: {
  user: User | null; open: boolean; onClose: () => void; onSaved: () => void; onDeleted: () => void;
  projects: Project[]; isAdminUser: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Add role state
  const [addRole, setAddRole] = useState<"admin" | "pm" | "lender" | "investor">("lender");
  const [addProjectId, setAddProjectId] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  // Lender data for new role
  const [principal, setPrincipal] = useState("");
  const [apr, setApr] = useState("");
  const [startDate, setStartDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");

  // Investor data for new role
  const [amountInvested, setAmountInvested] = useState("");
  const [equitySharePct, setEquitySharePct] = useState("");

  useEffect(() => {
    if (user) { setName(user.name); setPhone(user.phone || ""); setPassword(""); }
  }, [user]);

  if (!user) return null;

  const saveProfile = async () => {
    setSaving(true);
    const res = await api.put(`/api/users/${user.id}`, { name, phone, password: password || undefined });
    if (res.ok) onSaved();
    setSaving(false);
  };

  const toggleActive = async () => {
    await api.put(`/api/users/${user.id}`, { isActive: !user.isActive });
    onSaved();
  };

  const deleteUser = async (hard: boolean) => {
    const msg = hard
      ? `Permanently DELETE ${user.name}? This cannot be undone.`
      : `Deactivate ${user.name}? They will not be able to log in.`;
    if (!confirm(msg)) return;
    await api.delete(`/api/users/${user.id}${hard ? "?hard=true" : ""}`);
    onDeleted();
  };

  const removeRole = async (roleId: string) => {
    await api.delete(`/api/users/${user.id}/roles?roleId=${roleId}`);
    onSaved();
  };

  const addRoleSubmit = async () => {
    setAddingRole(true);
    const body: Record<string, unknown> = { role: addRole, projectId: addProjectId || null };
    if (addRole === "lender") body.lenderData = { principal: parseFloat(principal), apr: parseFloat(apr) / 100, startDate, maturityDate };
    if (addRole === "investor") body.investorData = { amountInvested: parseFloat(amountInvested), equitySharePct: parseFloat(equitySharePct) };
    await api.post(`/api/users/${user.id}/roles`, body);
    setShowAddRole(false); setAddProjectId(""); setPrincipal(""); setApr(""); setStartDate(""); setMaturityDate(""); setAmountInvested(""); setEquitySharePct("");
    setAddingRole(false);
    onSaved();
  };

  const needsProject = addRole === "pm" || addRole === "lender" || addRole === "investor";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit User — {user.name}</DialogTitle></DialogHeader>

        <div className="space-y-5">
          {/* Profile */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Profile</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>New Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep" />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : "Save Profile"}</Button>
              <Button size="sm" variant="outline" onClick={toggleActive}>
                {user.isActive ? <><UserX className="h-3 w-3 mr-1" />Deactivate</> : <><UserCheck className="h-3 w-3 mr-1" />Activate</>}
              </Button>
              {isAdminUser && (
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => deleteUser(true)}>
                  <AlertTriangle className="h-3 w-3 mr-1" /> Delete User
                </Button>
              )}
            </div>
          </div>

          {/* Current Roles */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Roles</p>
            <div className="space-y-2">
              {user.roles.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={ROLE_COLORS[r.role] || "secondary"}>{r.role}</Badge>
                    {r.project && <span className="text-gray-500 text-xs">{r.project.name}</span>}
                  </div>
                  {isAdminUser && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      onClick={() => removeRole(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lending Positions */}
          {user.lendingPositions && user.lendingPositions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Lending Positions</p>
              <div className="space-y-2">
                {user.lendingPositions.map((lp) => (
                  <div key={lp.id} className="p-2 border rounded text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-medium">{formatCurrency(lp.principal)}</span>
                      <span className="text-green-700">{(Number(lp.apr) * 100).toFixed(2)}% APR</span>
                    </div>
                    <p className="text-gray-400">{formatDate(lp.startDate)} → {formatDate(lp.maturityDate)}</p>
                    {lp.notes && <p className="text-gray-500">{lp.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equity Positions */}
          {user.equityPositions && user.equityPositions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Equity Positions</p>
              <div className="space-y-2">
                {user.equityPositions.map((ep) => (
                  <div key={ep.id} className="p-2 border rounded text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-medium">{formatCurrency(ep.amountInvested)}</span>
                      <span className="text-violet-700">{Number(ep.equitySharePct).toFixed(2)}% equity</span>
                    </div>
                    {ep.projectedReturn && <p className="text-gray-400">Projected: {formatCurrency(ep.projectedReturn)}</p>}
                    {ep.notes && <p className="text-gray-500">{ep.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Role */}
          <div>
            {!showAddRole ? (
              <Button size="sm" variant="outline" onClick={() => setShowAddRole(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add Role
              </Button>
            ) : (
              <div className="border rounded p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Add Role</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select value={addRole} onValueChange={(v) => setAddRole(v as typeof addRole)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {isAdminUser && <SelectItem value="admin">Admin</SelectItem>}
                        <SelectItem value="pm">PM</SelectItem>
                        <SelectItem value="lender">Lender</SelectItem>
                        <SelectItem value="investor">Investor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {needsProject && (
                    <div className="space-y-1">
                      <Label className="text-xs">Project</Label>
                      <Select value={addProjectId} onValueChange={setAddProjectId}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {addRole === "lender" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Principal ($)</Label><Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="h-8" /></div>
                    <div className="space-y-1"><Label className="text-xs">APR (%)</Label><Input type="number" step="0.1" value={apr} onChange={(e) => setApr(e.target.value)} className="h-8" /></div>
                    <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8" /></div>
                    <div className="space-y-1"><Label className="text-xs">Maturity Date</Label><Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} className="h-8" /></div>
                  </div>
                )}
                {addRole === "investor" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Amount ($)</Label><Input type="number" value={amountInvested} onChange={(e) => setAmountInvested(e.target.value)} className="h-8" /></div>
                    <div className="space-y-1"><Label className="text-xs">Equity (%)</Label><Input type="number" step="0.1" value={equitySharePct} onChange={(e) => setEquitySharePct(e.target.value)} className="h-8" /></div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={addRoleSubmit} disabled={addingRole || (needsProject && !addProjectId)}>
                    {addingRole ? "Adding…" : "Add Role"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddRole(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { isAdmin: isAdminFn } = useAuthStore();
  const isAdminUser = isAdminFn();

  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");

  const load = useCallback(async () => {
    const [uRes, pRes] = await Promise.all([
      api.get("/api/users"),
      api.get("/api/projects"),
    ]);
    if (uRes.ok) setUsers(await uRes.json());
    if (pRes.ok) setProjects(await pRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.roles.some((r) => r.role === roleFilter);
    return matchSearch && matchRole;
  });

  // When edit dialog saves, re-fetch full user with positions
  const handleEditSaved = async () => {
    await load();
    if (editUser) {
      const res = await api.get(`/api/users/${editUser.id}`);
      if (res.ok) setEditUser(await res.json());
    }
  };

  return (
    <AppLayout title="User Management" requireAdminOrPM>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search users…" className="pl-9" value={search}
                onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="pm">PM</SelectItem>
                <SelectItem value="lender">Lender</SelectItem>
                <SelectItem value="investor">Investor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add User
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      {["User", "Contact", "Roles & Projects", "Positions", "Joined", "Status", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No users found.</td></tr>
                    ) : filtered.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{u.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <div key={r.id} className="flex items-center gap-1">
                                <Badge variant={ROLE_COLORS[r.role] || "secondary"} className="text-xs">{r.role}</Badge>
                                {r.project && <span className="text-xs text-gray-400">{r.project.name}</span>}
                              </div>
                            ))}
                            {u.roles.length === 0 && <span className="text-xs text-gray-400">No roles</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {(u._count?.lendingPositions ?? 0) > 0 && (
                            <span className="block text-blue-600">{u._count!.lendingPositions} lending pos.</span>
                          )}
                          {(u._count?.equityPositions ?? 0) > 0 && (
                            <span className="block text-violet-600">{u._count!.equityPositions} equity pos.</span>
                          )}
                          {!u._count?.lendingPositions && !u._count?.equityPositions && "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <UserCheck className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              <UserX className="h-3 w-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" className="h-7 px-2"
                            onClick={async () => {
                              const res = await api.get(`/api/users/${u.id}`);
                              if (res.ok) setEditUser(await res.json());
                            }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { load(); setAddOpen(false); }}
        projects={projects}
        isAdminUser={isAdminUser}
      />

      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSaved={handleEditSaved}
        onDeleted={() => { setEditUser(null); load(); }}
        projects={projects}
        isAdminUser={isAdminUser}
      />
    </AppLayout>
  );
}
