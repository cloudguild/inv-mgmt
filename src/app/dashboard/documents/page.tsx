"use client";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  return (
    <AppLayout title="Documents">
      <Card>
        <CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Documents coming soon</p>
          <p className="text-sm text-gray-400 mt-1">
            Your project contracts, term sheets, and reports will appear here.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
