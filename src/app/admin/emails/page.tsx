"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, RefreshCw, Link2, Send, Paperclip, ExternalLink } from "lucide-react";

interface Thread {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  lastMessageAt: string;
  hasAttachments: boolean;
  isRead: boolean;
  project: { id: string; name: string } | null;
  _count: { messages: number };
}

interface Message {
  id: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  bodyHtml: string;
  sentAt: string;
  isOutbound: boolean;
  attachments: { name: string; s3Key: string; size: number }[] | null;
}

interface ThreadDetail {
  id: string;
  subject: string;
  fromEmail: string;
  messages: Message[];
  project: { id: string; name: string } | null;
}

interface Project { id: string; name: string }

export default function EmailsPage() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (sync = false) => {
    if (sync) setSyncing(true);
    const res = await api.get(`/api/emails${sync ? "?sync=1" : ""}`);
    if (res.ok) {
      const data = await res.json();
      setConnected(data.connected);
      setOutlookEmail(data.outlookEmail ?? "");
      setThreads(data.threads);
    }
    if (sync) setSyncing(false);
  }, []);

  useEffect(() => {
    load();
    api.get("/api/projects").then(async (r) => { if (r.ok) setProjects(await r.json()); });
  }, [load]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") load(true);
  }, [searchParams, load]);

  const openThread = async (id: string) => {
    const res = await api.get(`/api/emails/${id}`);
    if (res.ok) setSelected(await res.json());
    setShowReply(false);
    setReplyBody("");
  };

  const linkProject = async (projectId: string) => {
    if (!selected) return;
    const res = await api.patch(`/api/emails/${selected.id}`, { projectId: projectId || null });
    if (res.ok) {
      const updated = await res.json();
      setSelected((s) => s ? { ...s, project: updated.project } : s);
      await load();
    }
  };

  const sendReply = async () => {
    if (!selected || !replyBody) return;
    setReplying(true);
    const res = await api.post(`/api/emails/${selected.id}/reply`, {
      body: replyBody,
      toEmail: selected.fromEmail,
    });
    if (res.ok) {
      const msg = await res.json();
      setSelected((s) => s ? { ...s, messages: [...s.messages, msg] } : s);
      setReplyBody("");
      setShowReply(false);
    }
    setReplying(false);
  };

  const filtered = threads.filter((t) =>
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.fromEmail.toLowerCase().includes(search.toLowerCase()) ||
    t.fromName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Email Inbox" requireAdminOrPM>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-600" />
            {connected ? (
              <span className="text-sm text-gray-600">
                Connected as <strong>{outlookEmail}</strong>
              </span>
            ) : (
              <span className="text-sm text-gray-500">Outlook not connected</span>
            )}
          </div>
          <div className="flex gap-2">
            {connected && (
              <Button size="sm" variant="outline" onClick={() => load(true)} disabled={syncing}>
                <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
                Sync Inbox
              </Button>
            )}
            <a href="/api/auth/outlook">
              <Button size="sm" variant={connected ? "outline" : "default"}>
                <ExternalLink className="h-3 w-3 mr-1" />
                {connected ? "Reconnect Outlook" : "Connect Outlook"}
              </Button>
            </a>
          </div>
        </div>

        {!connected ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Mail className="h-12 w-12 text-gray-300" />
              <p className="text-gray-500 font-medium">Connect your Outlook account to start reading emails.</p>
              <a href="/api/auth/outlook">
                <Button>Connect Outlook</Button>
              </a>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 min-h-[600px]">
            {/* Thread list */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-2">
              <Input
                placeholder="Search emails…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[580px]">
                {filtered.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">No emails found. Try syncing.</p>
                )}
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openThread(t.id)}
                    className={`text-left p-3 rounded-lg border transition-colors ${selected?.id === t.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"} ${!t.isRead ? "font-medium" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm truncate">{t.subject || "(no subject)"}</p>
                      {t.hasAttachments && <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.fromName} &lt;{t.fromEmail}&gt;</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{formatDate(t.lastMessageAt)}</span>
                      {t.project && (
                        <Badge variant="secondary" className="text-xs py-0">{t.project.name}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Thread detail */}
            <div className="flex-1 min-w-0">
              {!selected ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-64 text-gray-400">
                    Select an email to view
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex flex-col h-full">
                  <CardHeader className="pb-2 border-b">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{selected.subject}</CardTitle>
                        <p className="text-sm text-gray-500 mt-0.5">From: {selected.fromEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Select
                          value={selected.project?.id ?? "none"}
                          onValueChange={(v) => linkProject(v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="h-8 w-48 text-sm">
                            <Link2 className="h-3 w-3 mr-1" />
                            <SelectValue placeholder="Link to project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unlink from project</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => setShowReply((v) => !v)}>
                          <Send className="h-3 w-3 mr-1" /> Reply
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-y-auto pt-4 space-y-4 max-h-[400px]">
                    {selected.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 ${msg.isOutbound ? "bg-blue-50 ml-8 border border-blue-100" : "bg-gray-50 mr-8"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">
                            {msg.isOutbound ? `You → ${msg.toEmail}` : `${msg.fromName} <${msg.fromEmail}>`}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(msg.sentAt)}</span>
                        </div>
                        {msg.bodyHtml ? (
                          <div
                            className="text-sm prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                          />
                        ) : (
                          <p className="text-sm text-gray-700">{msg.bodyText ?? ""}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>

                  {showReply && (
                    <div className="border-t p-4 space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Reply to {selected.fromEmail}</p>
                      <Textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write your reply… (HTML supported)"
                        rows={4}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowReply(false)}>Cancel</Button>
                        <Button size="sm" onClick={sendReply} disabled={replying || !replyBody}>
                          {replying ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Send
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
