import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, passwordHash } from "./db";
import type { Account } from "@/lib/shop";

const sessionCookie = "handigo_session";
const sessionAge = 7 * 24 * 60 * 60;
const sessionKey = (token: string) => createHash("sha256").update(token).digest("hex");

export function fail(message: string, status = 400): never {
  throw new ShopError(message, status);
}

export class ShopError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function field(value: unknown, label: string, min: number, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < min || text.length > max) fail(label + " không hợp lệ.");
  return text;
}

export async function currentAccount(): Promise<Account | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (!token) return null;
  const account = db.prepare(`
    SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires > ?
  `).get(sessionKey(token), Date.now()) as Account | undefined;
  return account ? { ...account } : null;
}

export async function authenticate(body: Record<string, unknown>, register: boolean, secure: boolean) {
  const email = field(body.email, "Email", 4, 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Email không hợp lệ.");
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 128) fail("Mật khẩu cần từ 8 đến 128 ký tự.");
  const reservedAdmin = process.env.HANDIGO_ADMIN_EMAIL?.trim().toLowerCase();
  const row = db.prepare("SELECT id, password FROM users WHERE email = ?").get(email);
  let id: string;
  if (register) {
    if (row || email === reservedAdmin) fail("Email này không dùng được để đăng ký.", 409);
    id = randomBytes(16).toString("hex");
    db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, 'customer')")
      .run(id, email, field(body.name, "Họ tên", 2, 80), passwordHash(password));
  } else {
    const stored = typeof row?.password === "string" ? row.password : null;
    const candidate = passwordHash(password, stored?.split(":")[0] ?? "handigo-invalid-account");
    if (!stored || !timingSafeEqual(Buffer.from(candidate), Buffer.from(stored))) {
      fail("Email hoặc mật khẩu chưa đúng.", 401);
    }
    id = String(row?.id);
  }
  const jar = await cookies();
  const previous = jar.get(sessionCookie)?.value;
  if (previous) db.prepare("DELETE FROM sessions WHERE token = ?").run(sessionKey(previous));
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires <= ?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(sessionKey(token), id, Date.now() + sessionAge * 1000);
  jar.set(sessionCookie, token, {
    httpOnly: true, secure, sameSite: "lax", path: "/",
    ...(body.remember === "on" ? { maxAge: sessionAge } : {}),
  });
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(sessionKey(token));
  jar.delete(sessionCookie);
}
