"use server";

import { redirect } from "next/navigation";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { authenticateUser } from "@/src/lib/db/users-repository";
import { setAuthCookie } from "@/src/lib/auth/server";
import {
  clearLoginAttempts,
  isLoginLocked,
  recordFailedLogin,
} from "@/src/lib/auth/login-rate-limit";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const db = getClassPilotDatabase();

  if (isLoginLocked(db, username)) {
    redirect("/login?error=locked");
  }

  const user = authenticateUser(db, username, password);

  if (!user) {
    recordFailedLogin(db, username);
    redirect("/login?error=1");
  }

  clearLoginAttempts(db, username);
  await setAuthCookie(user.id);
  redirect("/");
}

export async function logoutAction() {
  const { clearAuthCookie } = await import("@/src/lib/auth/server");

  await clearAuthCookie();
  redirect("/login");
}
