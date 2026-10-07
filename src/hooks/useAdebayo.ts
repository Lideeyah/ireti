"use client";
import { useMemo } from "react";
import { useStore, selectAdebayo } from "@/lib/store/store";

export function useAdebayo() {
  const db = useStore((s) => s.db);
  return useMemo(() => selectAdebayo(db), [db]);
}
