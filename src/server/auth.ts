import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { Role } from "@/lib/domain/types";
import { can, type Permission } from "@/lib/auth/roles";
import { prisma } from "./db";

const COOKIE = "ireti_session";
const SESSION_DAYS = 14;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string | null;
  organisationId: string;
  organisationType: "sme" | "bank";
}

export class AuthError extends Error {
  constructor(message: string, public status = 401) {
    super(message);
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await prisma.session.deleteMany({ where: { id } });
  jar.delete(COOKIE);
}

/** Current user, or null. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const session = await prisma.session.findUnique({ where: { id }, include: { user: { include: { organisation: true } } } });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    title: u.title,
    organisationId: u.organisationId,
    organisationType: u.organisation.type as "sme" | "bank",
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Sign in required");
  return user;
}

export async function requireBankUser(permission?: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (user.organisationType !== "bank") throw new AuthError("Bank access required", 403);
  if (permission && !can(user.role, permission)) throw new AuthError("You do not have permission to perform this action", 403);
  return user;
}

export async function requireSmeUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.organisationType !== "sme") throw new AuthError("Business account required", 403);
  return user;
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { organisation: true } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new AuthError("The email or password is incorrect.");
  await createSession(user.id);
  return { id: user.id, email: user.email, name: user.name, role: user.role as Role, title: user.title, organisationId: user.organisationId, organisationType: user.organisation.type as "sme" | "bank" };
}

export async function signUpSme(input: { name: string; email: string; password: string; businessName: string }): Promise<SessionUser> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AuthError("Enter a valid email address.", 400);
  if (input.password.length < 8) throw new AuthError("Password must be at least 8 characters.", 400);
  if (input.name.trim().length < 2) throw new AuthError("Enter your full name.", 400);
  if (input.businessName.trim().length < 2) throw new AuthError("Enter the business name.", 400);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AuthError("An account with this email already exists.", 409);
  const org = await prisma.organisation.create({ data: { name: input.businessName.trim(), type: "sme" } });
  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(input.password), name: input.name.trim(), role: "SME_USER", title: "Authorised signatory", organisationId: org.id },
  });
  await createSession(user.id);
  return { id: user.id, email, name: user.name, role: "SME_USER", title: user.title, organisationId: org.id, organisationType: "sme" };
}
