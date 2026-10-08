"use server";

import { revalidatePath } from "next/cache";
import type { DemoPace } from "@/lib/demo/script";
import * as run from "@/server/demoRun";
import { ServiceError } from "@/server/core";

export type RunResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function guard<T>(fn: () => Promise<T>): Promise<RunResult<T>> {
  try {
    const data = await fn();
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "The guided run could not continue." };
  }
}

export async function startRunAction(pace: DemoPace) {
  return guard(() => run.startRun(pace));
}

export async function runStepAction() {
  return guard(() => run.runStep());
}

export async function stopRunAction() {
  return guard(() => run.stopRun());
}
