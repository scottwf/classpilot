"use server";

import { redirect } from "next/navigation";
import { setAuthCookie } from "@/src/lib/auth/server";
import { verifyAppPassword } from "@/src/lib/auth/secrets";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!verifyAppPassword(password)) {
    redirect("/login?error=1");
  }

  await setAuthCookie();
  redirect("/");
}

export async function logoutAction() {
  const { clearAuthCookie } = await import("@/src/lib/auth/server");

  await clearAuthCookie();
  redirect("/login");
}
