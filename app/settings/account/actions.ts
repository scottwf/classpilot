"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { createUser, getUserByUsername } from "@/src/lib/db/users-repository";

const usernamePattern = /^[a-zA-Z0-9_.-]{3,32}$/;
const minPasswordLength = 8;

/**
 * Provisions a new account. Invite-only / admin-provisioned model (issue
 * #21 Phase 3): any already-authenticated user can create another account
 * -- there's no separate "admin" role, matching the issue's recommendation
 * to skip building a role system nobody needs yet. No open self-signup;
 * this is only reachable from inside the app.
 */
export async function createAccountAction(formData: FormData) {
  await requireAuth();

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!usernamePattern.test(username)) {
    redirect(
      "/settings/account?error=username&message=" +
        encodeURIComponent("Username must be 3-32 characters: letters, numbers, . _ -"),
    );
  }

  if (password.length < minPasswordLength) {
    redirect(
      "/settings/account?error=password&message=" +
        encodeURIComponent(`Password must be at least ${minPasswordLength} characters.`),
    );
  }

  if (password !== confirmPassword) {
    redirect("/settings/account?error=mismatch&message=" + encodeURIComponent("Passwords don't match."));
  }

  const db = getClassPilotDatabase();

  if (getUserByUsername(db, username)) {
    redirect("/settings/account?error=taken&message=" + encodeURIComponent("That username is already taken."));
  }

  createUser(db, { username, password });

  redirect("/settings/account?created=1");
}
