"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2, Plus, FileText, DollarSign, Pencil, Trash2, Upload,
} from "lucide-react";

const VENDOR_TYPES = [
  "General Contractor", "Sub-Contractor", "Architect", "Engineer",
  "Attorney", "Accountant", "Lender", "Insurance", "Title Company",
  "Real Estate Agent", "Property Manager", "Supplier", "Other",
];

const DOC_TYPES = [
  "Agreement", "Invoice", "Payment Receipt", "Insurance", "1099", "K-1",
  "Drawing", "Amendment", "Statement", "Other",
];

const TX_TYPES = ["payment", "invoice", "refund", "deposit", "other"];

interface Vendor {
  id: string;
  companyName: string;
  vendorType: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  taxId: string | null;
  licenseNo: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  _count: { documents: number; transactions: number };
}

interface VendorDoc {
  id: string;
  docType: string;
  title: string;
  filename: string;
  amount: string | null;
  docDate: string | null;
  notes: string | null;
  createdAt: string;
  uploader: { id: string; name: string };
}

interface VendorTx {
  id: string;
  date: string;
  amount: string;
  txType: string;
  description: string | null;
  reference: string | null;
  creator: { id: string; name: string };
}

const EMPTY_VENDOR = {
  companyName: "", vendorType: "", contactName: "", email: "", phone: "",
  address: "", city: "", state: "", zip: "", taxId: "", licenseNo: "",
  website: "", notes: "",
};

export function ProjectVendorsTab({ projectId }: { projectId: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [subTab, setSubTab] = useState("profile");
  const [docs, setDocs] = useState<VendorDoc[]>([]);
  const [txs, setTxs] = useState<VendorTx[]>([]);
  const [loading, setLoading] = useState(true);

  // dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);

  // forms
  const [vendorForm, setVendorForm] = useState(EMPTY_VENDOR);
  const [docForm, setDocForm] = useState({ docType: "", title: "", filename: "", amount: "", docDate: "", notes: "" });
  const [txForm, setTxForm] = useState({ date: "", amount: "", txType: "", description: "", reference: "" });

  // filters
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  const loadVendors = useCallback(async () => {
    const res = await api.get(`/api/projects/${projectId}/vendors`);
    if (res.ok) setVendors(await res.json());
    setLoading(false);
  }, [projectId]);

  const loadDocs = useCallback(async (vendorId: string) => {
    const params = docTypeFilter !== "all" ? `?docType=${docTypeFilter}` : "";
    const res = await api.get(`/api/vendors/${vendorId}/documents${params}`);
    if (res.ok) setDocs(await res.json());
  }, [docTypeFilter]);

  const loadTxs = useCallback(async (vendorId: string) => {
    const q = new URLSearchParams();
    if (txSearch) q.set("search", txSearch);
    if (txDateFrom) q.set("dateFrom", txDateFrom);
    if (txDateTo) q.set("dateTo", txDateTo);
    if (txTypeFilter !== "all") q.set("txType", txTypeFilter);
    const res = await api.get(`/api/vendors/${vendorId}/transactions?${q.toString()}`);
    if (res.ok) setTxs(await res.json());
  }, [txSearch, txDateFrom, txDateTo, txTypeFilter]);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  useEffect(() => {
    if (selected) {
      if (subTab === "documents") loadDocs(selected.id);
      if (subTab === "transactions") loadTxs(selected.id);
    }
  }, [selected, subTab, loadDocs, loadTxs]);

  const selectVendor = (v: Vendor) => {
    setSelected(v);
    setSubTab("profile");
  };

  const handleAddVendor = async () => {
    const res = await api.post(`/api/projects/${projectId}/vendors`, vendorForm);
    if (res.ok) {
      await loadVendors();
      setAddOpen(false);
      setVendorForm(EMPTY_VENDOR);
    }
  };

  const handleEditVendor = async () => {
    if (!selected) return;
    const res = await api.put(`/api/vendors/${selected.id}`, vendorForm);
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      await loadVendors();
      setEditOpen(false);
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setVendorForm({
      companyName: selected.companyName || "",
      vendorType: selected.vendorType || "",
      contactName: selected.contactName || "",
      email: selected.email || "",
      phone: selected.phone || "",
      address: selected.address || "",
      city: selected.city || "",
      state: selected.state || "",
      zip: selected.zip || "",
      taxId: selected.taxId || "",
      licenseNo: selected.licenseNo || "",
      website: selected.website || "",
      notes: selected.notes || "",
    });
    setEditOpen(true);
  };

  const handleDeactivate = async () => {
    if (!selected) return;
    const res = await api.delete(`/api/vendors/${selected.id}`);
    if (res.ok) {
      setSelected(null);
      await loadVendors();
    }
  };

  const handleAddDoc = async () => {
    if (!selected) return;
    const res = await api.post(`/api/vendors/${selected.id}/documents`, {
      ...docForm,
      amount: docForm.amount ? parseFloat(docForm.amount) : null,
    });
    if (res.ok) {
      await loadDocs(selected.id);
      setDocOpen(false);
      setDocForm({ docType: "", title: "", filename: "", amount: "", docDate: "", notes: "" });
      // refresh count
      await loadVendors();
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!selected) return;
    const res = await api.delete(`/api/vendors/${selected.id}/documents/${docId}`);
    if (res.ok) {
      await loadDocs(selected.id);
      await loadVendors();
    }
  };

  const handleAddTx = async () => {
    if (!selected) return;
    const res = await api.post(`/api/vendors/${selected.id}/transactions`, {
      ...txForm,
      amount: parseFloat(txForm.amount),
    });
    if (res.ok) {
      await loadTxs(selected.id);
      setTxOpen(false);
      setTxForm({ date: "", amount: "", txType: "", description: "", reference: "" });
      await loadVendors();
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-400">Loading vendors…</div>;

  return (
    <div className="flex gap-4 h-full min-h-[600px]">
      {/* Left: vendor list */}
      <div className="w-72 flex-shrink-0 space-y-2">
        <Button size="sm" className="w-full" onClick={() => { setVendorForm(EMPTY_VENDOR); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Vendor
        </Button>
        {vendors.length === 0 && (
          <p className="text-sm text-gray-400 text-center pt-4">No vendors yet.</p>
        )}
        {vendors.map((v) => (
          <button
            key={v.id}
            onClick={() => selectVendor(v)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${selected?.id === v.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"} ${!v.isActive ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{v.companyName}</p>
                <p className="text-xs text-gray-500">{v.vendorType}</p>
                <div className="flex gap-2 mt-1 text-xs text-gray-400">
                  <span>{v._count.documents} docs</span>
                  <span>{v._count.transactions} txns</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Right: vendor detail */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64 text-gray-400">
              Select a vendor to view details
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selected.companyName}</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">{selected.vendorType}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={selected.isActive ? "success" : "secondary"}>
                    {selected.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={openEdit}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  {selected.isActive && (
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeactivate}>
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={subTab} onValueChange={setSubTab}>
                <TabsList>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="documents">
                    Documents
                    {selected._count.documents > 0 && (
                      <span className="ml-1 text-xs bg-gray-200 rounded-full px-1.5">{selected._count.documents}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="transactions">
                    Transactions
                    {selected._count.transactions > 0 && (
                      <span className="ml-1 text-xs bg-gray-200 rounded-full px-1.5">{selected._count.transactions}</span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Profile */}
                <TabsContent value="profile" className="mt-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <InfoRow label="Contact Name" value={selected.contactName} />
                    <InfoRow label="Email" value={selected.email} />
                    <InfoRow label="Phone" value={selected.phone} />
                    <InfoRow label="Website" value={selected.website} />
                    <InfoRow label="Tax ID" value={selected.taxId} />
                    <InfoRow label="License No." value={selected.licenseNo} />
                    <div className="col-span-2">
                      <InfoRow label="Address" value={[selected.address, selected.city, selected.state, selected.zip].filter(Boolean).join(", ")} />
                    </div>
                    {selected.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-medium uppercase mb-0.5">Notes</p>
                        <p className="text-gray-700 whitespace-pre-line">{selected.notes}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Documents */}
                <TabsContent value="documents" className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v)}>
                      <SelectTrigger className="w-44 h-8 text-sm">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setDocOpen(true)}>
                      <Upload className="h-3 w-3 mr-1" /> Add Document
                    </Button>
                  </div>
                  {docs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No documents found.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50">
                        <tr>
                          {["Type", "Title", "File", "Amount", "Date", "Uploaded By", ""].map((h) => (
                            <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {docs.map((d) => (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2"><Badge variant="secondary">{d.docType}</Badge></td>
                            <td className="px-3 py-2 font-medium">{d.title}</td>
                            <td className="px-3 py-2 text-gray-500">
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {d.filename}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{d.amount ? formatCurrency(parseFloat(d.amount)) : "—"}</td>
                            <td className="px-3 py-2 text-gray-500">{d.docDate ? formatDate(d.docDate) : "—"}</td>
                            <td className="px-3 py-2 text-gray-500">{d.uploader.name}</td>
                            <td className="px-3 py-2">
                              <button onClick={() => handleDeleteDoc(d.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </TabsContent>

                {/* Transactions */}
                <TabsContent value="transactions" className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Search description / reference…"
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className="h-8 text-sm w-56"
                    />
                    <Input type="date" value={txDateFrom} onChange={(e) => setTxDateFrom(e.target.value)} className="h-8 text-sm w-36" />
                    <span className="text-gray-400 text-sm">to</span>
                    <Input type="date" value={txDateTo} onChange={(e) => setTxDateTo(e.target.value)} className="h-8 text-sm w-36" />
                    <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                      <SelectTrigger className="w-32 h-8 text-sm">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {TX_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => loadTxs(selected.id)}>Filter</Button>
                    <Button size="sm" onClick={() => setTxOpen(true)} className="ml-auto">
                      <Plus className="h-3 w-3 mr-1" /> Add Transaction
                    </Button>
                  </div>
                  {txs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No transactions found.</p>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            {["Date", "Type", "Amount", "Description", "Reference", "By"].map((h) => (
                              <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {txs.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-500">{formatDate(t.date)}</td>
                              <td className="px-3 py-2"><Badge variant="secondary" className="capitalize">{t.txType}</Badge></td>
                              <td className="px-3 py-2 font-medium">{formatCurrency(parseFloat(t.amount))}</td>
                              <td className="px-3 py-2 text-gray-600">{t.description || "—"}</td>
                              <td className="px-3 py-2 text-gray-500">{t.reference || "—"}</td>
                              <td className="px-3 py-2 text-gray-500">{t.creator.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-end pt-1">
                        <p className="text-sm font-medium text-gray-700">
                          Total: {formatCurrency(txs.reduce((sum, t) => sum + parseFloat(t.amount), 0))}
                        </p>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Vendor Dialog */}
      <VendorFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Vendor"
        form={vendorForm}
        onChange={(k, v) => setVendorForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleAddVendor}
      />

      {/* Edit Vendor Dialog */}
      <VendorFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Vendor"
        form={vendorForm}
        onChange={(k, v) => setVendorForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleEditVendor}
      />

      {/* Add Document Dialog */}
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Document Type</Label>
              <Select value={docForm.docType} onValueChange={(v) => setDocForm((f) => ({ ...f, docType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Field label="Title" value={docForm.title} onChange={(v) => setDocForm((f) => ({ ...f, title: v }))} />
            <Field label="Filename" value={docForm.filename} onChange={(v) => setDocForm((f) => ({ ...f, filename: v }))} />
            <Field label="Amount (optional)" type="number" value={docForm.amount} onChange={(v) => setDocForm((f) => ({ ...f, amount: v }))} />
            <Field label="Document Date (optional)" type="date" value={docForm.docDate} onChange={(v) => setDocForm((f) => ({ ...f, docDate: v }))} />
            <div>
              <Label>Notes</Label>
              <Textarea value={docForm.notes} onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDoc} disabled={!docForm.docType || !docForm.title || !docForm.filename}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Date" type="date" value={txForm.date} onChange={(v) => setTxForm((f) => ({ ...f, date: v }))} />
            <Field label="Amount ($)" type="number" value={txForm.amount} onChange={(v) => setTxForm((f) => ({ ...f, amount: v }))} />
            <div>
              <Label>Type</Label>
              <Select value={txForm.txType} onValueChange={(v) => setTxForm((f) => ({ ...f, txType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{TX_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Field label="Description (optional)" value={txForm.description} onChange={(v) => setTxForm((f) => ({ ...f, description: v }))} />
            <Field label="Reference (optional)" value={txForm.reference} onChange={(v) => setTxForm((f) => ({ ...f, reference: v }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTx} disabled={!txForm.date || !txForm.amount || !txForm.txType}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase mb-0.5">{label}</p>
      <p className="text-gray-700">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function VendorFormDialog({
  open, onClose, title, form, onChange, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  form: typeof EMPTY_VENDOR;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Company Name *" value={form.companyName} onChange={(v) => onChange("companyName", v)} />
            </div>
            <div className="col-span-2">
              <Label>Vendor Type *</Label>
              <Select value={form.vendorType} onValueChange={(v) => onChange("vendorType", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{VENDOR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Name" value={form.contactName} onChange={(v) => onChange("contactName", v)} />
              <Field label="Email" type="email" value={form.email} onChange={(v) => onChange("email", v)} />
              <Field label="Phone" value={form.phone} onChange={(v) => onChange("phone", v)} />
              <Field label="Website" value={form.website} onChange={(v) => onChange("website", v)} />
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Street Address" value={form.address} onChange={(v) => onChange("address", v)} />
              </div>
              <Field label="City" value={form.city} onChange={(v) => onChange("city", v)} />
              <Field label="State" value={form.state} onChange={(v) => onChange("state", v)} />
              <Field label="ZIP" value={form.zip} onChange={(v) => onChange("zip", v)} />
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tax / Legal</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tax ID / EIN" value={form.taxId} onChange={(v) => onChange("taxId", v)} />
              <Field label="License No." value={form.licenseNo} onChange={(v) => onChange("licenseNo", v)} />
            </div>
          </div>
          <div className="border-t pt-3">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => onChange("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!form.companyName || !form.vendorType}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
