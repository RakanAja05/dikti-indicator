"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { scopeForLocation } from "@/lib/chat-scope";
import { useDashboardStore } from "@/store/dashboard-store";
import type { ChatScope } from "@/types/chat";

/** Cakupan jawaban untuk halaman yang sedang dibuka (Overview atau satu IKU). */
export function useChatScope(): ChatScope {
  const pathname = usePathname();
  const activeDashboardTab = useDashboardStore((state) => state.activeDashboardTab);
  return useMemo(() => scopeForLocation(pathname, activeDashboardTab), [pathname, activeDashboardTab]);
}
