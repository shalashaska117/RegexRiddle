import assert from "node:assert/strict";
import crypto from "node:crypto";
import { HttpClient } from "./http.js";

const client = new HttpClient();

// unique per run so reruns stay green against the same database
const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
const username = `u_${unique}`;
const password = "a sufficiently long password";

// register
{
  const res = await client.post("/api/auth/register", { username, password });
  assert.equal(res.status, 201);
  const body = res.body as { id: number; username: string };
  assert.equal(typeof body.id, "number");
  assert.equal(body.username, username);
  assert.deepEqual(Object.keys(body).sort(), ["id", "username"]);
}

// duplicate register
{
  const res = await client.post("/api/auth/register", { username, password });
  assert.equal(res.status, 409);
}

// login with the wrong password and with an unknown user: both 401, and the
// message must be identical so usernames cannot be probed
{
  const wrongPassword = await client.post("/api/auth/login", { username, password: "not the password" });
  assert.equal(wrongPassword.status, 401);
  const unknownUser = await client.post("/api/auth/login", { username: `u_${unique}x`, password });
  assert.equal(unknownUser.status, 401);
  assert.deepEqual(wrongPassword.body, unknownUser.body);
}

// login
let userId: number;
{
  const res = await client.post("/api/auth/login", { username, password });
  assert.equal(res.status, 200);
  const body = res.body as { id: number; username: string };
  assert.equal(body.username, username);
  userId = body.id;
  assert.ok(res.setCookies.some((c) => c.startsWith("rr.sid=")));
}

// me while logged in; same shape as GET /api/users/me
{
  const res = await client.get("/api/auth/me");
  assert.equal(res.status, 200);
  const body = res.body as { id: number; username: string; avatarUrl: string | null; createdAt: string };
  assert.equal(body.id, userId);
  assert.equal(body.username, username);
  assert.equal(body.avatarUrl, null);
  assert.equal(typeof body.createdAt, "string");
  assert.deepEqual(Object.keys(body).sort(), ["avatarUrl", "createdAt", "id", "username"]);
}

// logout
{
  const res = await client.post("/api/auth/logout");
  assert.equal(res.status, 204);
}

// me after logout
{
  const res = await client.get("/api/auth/me");
  assert.equal(res.status, 401);
}

// validation rejections on register
{
  const shortUsername = await client.post("/api/auth/register", { username: "ab", password });
  assert.equal(shortUsername.status, 422);
  const body = shortUsername.body as { errors: Record<string, string> };
  assert.equal(typeof body.errors["username"], "string");

  const uppercaseUsername = await client.post("/api/auth/register", { username: `U_${unique}`, password });
  assert.equal(uppercaseUsername.status, 422);

  const shortPassword = await client.post("/api/auth/register", { username: `u_${unique}b`, password: "short" });
  assert.equal(shortPassword.status, 422);

  const unknownField = await client.post("/api/auth/register", { username: `u_${unique}c`, password, admin: true });
  assert.equal(unknownField.status, 422);
}
