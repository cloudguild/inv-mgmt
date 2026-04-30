"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Download, Trash2, FileText } from "lucide-react";

interface Doc {
  id: string;
  filename: string;
  docType: string;
  year: number | null;
  s3Key: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

const DOC_TYPES = [
  { value: "agreement", label: "Agreement" },
  { value: "amendment", label: "Amendment" },
  { value: "contract", label: "Contract" },
  { value: "disclosure", label: "Disclosure" },
  { value: "K1", label: "K-1 Tax" },
  { value: "INT_1099", label: "1099-INT" },
  { value: "permit", label: "Permit" },
  { value: "plan", label: "Plan / Drawing" },
  { value: "report", label: "Report" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
];

export function ProjectDocumentsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("other");
  const [year, setYear] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await api.get(`/api/projects/${projectId}/documents`);
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const upRes = await api.post("/api/upload", { filename: file.name, contentType: file.type, folder: `projects/${projectId}/docs` });
      if (!upRes.ok) throw new Error("Failed to get upload URL");
      const { url, key } = await upRes.json();
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await api.post(`/api/projects/${projectId}/documents`, {
        filename: file.name,
        docType,
        year: year || null,
        s3Key: key,
      });
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownload = async (doc: Doc) => {
    if (!doc.s3Key) return;
    const res = await api.get(`/api/download?key=${encodeURIComponent(doc.s3Key)}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    await api.delete(`/api/projects/${projectId}/documents?docId=${docId}`);
    await load();
  };

  const filtered = typeFilter === "all" ? docs : docs.filter((d) => d.docType === typeFilter);

  return (
    <div className="space-y-4">
      {/* Upload bar */}
      <div className="flex items-center gap-3 flex-wrap p-3 bg-gray-50 rounded-lg border">
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Year (optional)"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="h-8 w-32 text-sm"
        />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="h-3 w-3 mr-1" />
          {uploading ? "Uploading…" : "Upload Document"}
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Filter:</span>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">{filtered.length} document{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
          <FileText className="h-10 w-10" />
          <p className="text-sm">No documents yet. Upload the first one above.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs py-0">
                      {DOC_TYPES.find((t) => t.value === doc.docType)?.label ?? doc.docType}
                    </Badge>
                    {doc.year && <span className="text-xs text-gray-400">{doc.year}</span>}
                    <span className="text-xs text-gray-400">{formatDate(doc.createdAt)} · {doc.user.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {doc.s3Key && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(doc)}>
                    <Download className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(doc.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
