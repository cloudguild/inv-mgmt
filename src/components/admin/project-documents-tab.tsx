"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Download, Trash2, FileText, Eye, Share2, Copy, X } from "lucide-react";

interface Doc {
  id: string;
  filename: string;
  docType: string;
  year: number | null;
  s3Key: string | null;
  shareToken: string | null;
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

function isPreviewable(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
}

function isImage(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
}

export function ProjectDocumentsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("other");
  const [year, setYear] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);

  // Viewer state
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerDoc, setViewerDoc] = useState<Doc | null>(null);

  // Share state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);
  const [copying, setCopying] = useState(false);

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
      const upRes = await api.post("/api/upload", {
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder: `projects/${projectId}/docs`,
      });
      if (!upRes.ok) throw new Error("Failed to get upload URL");
      const { url, key } = await upRes.json();
      const s3Res = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (!s3Res.ok) throw new Error("S3 upload failed");
      await api.post(`/api/projects/${projectId}/documents`, {
        filename: file.name,
        docType,
        year: year || null,
        s3Key: key,
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const getPresignedUrl = async (doc: Doc): Promise<string | null> => {
    if (!doc.s3Key) return null;
    const res = await api.get(`/api/download?key=${encodeURIComponent(doc.s3Key)}`);
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  };

  const handleView = async (doc: Doc) => {
    const url = await getPresignedUrl(doc);
    if (url) { setViewerDoc(doc); setViewerUrl(url); }
  };

  const handleDownload = async (doc: Doc) => {
    const url = await getPresignedUrl(doc);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      a.click();
    }
  };

  const handleShare = async (doc: Doc) => {
    const res = await api.patch(`/api/projects/${projectId}/documents`, {
      docId: doc.id,
      action: "share",
    });
    if (res.ok) {
      const { shareUrl: url } = await res.json();
      setShareDoc(doc);
      setShareUrl(url);
      await load();
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
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
                    {doc.shareToken && <Badge variant="secondary" className="text-xs py-0 text-green-700 bg-green-50">Shared</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {doc.s3Key && isPreviewable(doc.filename) && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View" onClick={() => handleView(doc)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                {doc.s3Key && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Download" onClick={() => handleDownload(doc)}>
                    <Download className="h-3 w-3" />
                  </Button>
                )}
                {doc.s3Key && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Share link" onClick={() => handleShare(doc)}>
                    <Share2 className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" title="Delete"
                  onClick={() => handleDelete(doc.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline document viewer */}
      <Dialog open={!!viewerUrl} onOpenChange={(o) => { if (!o) { setViewerUrl(null); setViewerDoc(null); } }}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b flex-shrink-0">
            <DialogTitle className="text-sm font-medium truncate max-w-xl">{viewerDoc?.filename}</DialogTitle>
            <div className="flex items-center gap-2">
              {viewerDoc && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDownload(viewerDoc)}>
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setViewerUrl(null); setViewerDoc(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-gray-100">
            {viewerDoc && isImage(viewerDoc.filename) ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={viewerUrl!} alt={viewerDoc.filename} className="max-w-full max-h-full object-contain rounded shadow" />
              </div>
            ) : (
              <iframe
                src={viewerUrl!}
                className="w-full h-full border-0"
                title={viewerDoc?.filename}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share link dialog */}
      <Dialog open={!!shareUrl} onOpenChange={(o) => { if (!o) { setShareUrl(null); setShareDoc(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Anyone with this link can view <strong>{shareDoc?.filename}</strong> without logging in.
            </p>
            <div className="flex items-center gap-2">
              <Input value={shareUrl ?? ""} readOnly className="text-xs font-mono" />
              <Button size="sm" onClick={handleCopy} className="flex-shrink-0">
                <Copy className="h-3 w-3 mr-1" />
                {copying ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-gray-400">The link redirects to a secure, time-limited download URL that refreshes each time it is accessed.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
