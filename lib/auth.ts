import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  authEnabled,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session";

const DEFAULT_USERNAME = "owner";
const DEFAULT_PASSWORD_HASH =
  "$2b$10$72WdYspQUgMgzKrAW0Yle.17jeeJUXnuM0m1YbWY0.RnJ6HZF9sG2";

export type SessionUser = {
  id: number;
  username: string;
  isStaff: boolean;
  isSuperuser: boolean;
};

export async function isAuthenticated(): Promise<boolean> {
  if (!authEnabled()) return true;
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser> {
  let user = await prisma.user.findUnique({
    where: { username: DEFAULT_USERNAME },
  });

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          username: DEFAULT_USERNAME,
          email: "",
          passwordHash: DEFAULT_PASSWORD_HASH,
          isActive: true,
          isStaff: true,
          isSuperuser: true,
        },
      });
    } catch {
      user = await prisma.user.findUnique({
        where: { username: DEFAULT_USERNAME },
      });
    }
  }

  if (!user) {
    throw new Error(
      "Could not create default user. Check that the database tables exist (run prisma/supabase_setup.sql).",
    );
  }

  return {
    id: user.id,
    username: user.username,
    isStaff: user.isStaff,
    isSuperuser: user.isSuperuser,
  };
}
