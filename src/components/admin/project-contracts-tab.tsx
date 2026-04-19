"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileText, Download, Send } from "lucide-react";

interface Contract {
  id: string;
  filename: string;
  documentType: string;
  signingStatus: string;
  signedAt: string | null;
  expiryDate: string | null;
  user: { name: string };
}

const signingBadge = (status: string) => {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    signed: "success",
    pending: "warning",
    draft: "secondary",
    expired: "danger",
  };
  return map[status] || "secondary";
};

export function ProjectContractsTab({ projectId, project }: { projectId: string; project: unknown }) {
  const contracts = ((project as { contracts?: Contract[] }).contracts) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-1" />
          Upload Contract
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {["Filename", "Partner", "Type", "Status", "Signed Date", "Expiry", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {contracts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No contracts on this project.</td></tr>
                ) : (
                  contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{c.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{c.user.name}</td>
                      <td className="px-4 py-3 capitalize">{c.documentType.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <Badge variant={signingBadge(c.signingStatus)}>{c.signingStatus}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.signedAt ? formatDate(c.signedAt) : "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{c.expiryDate ? formatDate(c.expiryDate) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {c.signingStatus === "signed" ? (
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline">
                              <Send className="h-3 w-3 mr-1" />
                              Send for Signature
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
