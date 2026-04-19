import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface JWTPayload {
  userId: string;
  email: string;
  roles: { role: string; projectId: string | null }[];
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getAuthUser(
  req: NextRequest
): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  return verifyAccessToken(token);
}

export async function getUserWithRoles(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
}

export function hasRole(
  user: JWTPayload,
  role: string,
  projectId?: string
): boolean {
  return user.roles.some(
    (r) =>
      r.role === role && (!projectId || r.projectId === projectId || r.role === "admin")
  );
}

export function isAdmin(user: JWTPayload): boolean {
  return user.roles.some((r) => r.role === "admin");
}

export function isPM(user: JWTPayload, projectId?: string): boolean {
  return user.roles.some(
    (r) =>
      r.role === "admin" ||
      (r.role === "pm" && (!projectId || r.projectId === projectId))
  );
}
