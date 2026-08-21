"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { updateUnitDates } from "@/src/lib/db/planner-repository";

export async function moveUnitAction(id: string, startDate: string, endDate: string) {
  const userId = await requireAuth();

  if (!id || !startDate || !endDate || endDate < startDate) {
    return;
  }

  updateUnitDates(getClassPilotDatabase(), userId, { endDate, id, startDate });

  redirect("/units");
}
