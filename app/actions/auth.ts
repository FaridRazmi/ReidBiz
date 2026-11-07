"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth";
import { authEnabled } from "@/lib/session";

export type LoginState = { error?: string };

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!authEnabled()) {
    return { error: "Login is disabled because APP_PASSWORD is not set on the server." };
  }

  const submitted = String(formData.get("password") ?? "");
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  const matches = a.length === b.length && timingSafeEqual(a, b);

  if (!matches) return { error: "Wrong password. Try again." };

  await startSession();
  redirect(safeNext(String(formData.get("next") ?? "/dashboard")));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
