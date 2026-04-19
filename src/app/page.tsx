"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function HomePage() {
  const router = useRouter();
  const { user, isAdmin } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    } else if (isAdmin()) {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }
  }, [user, isAdmin, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
    </div>
  );
}
