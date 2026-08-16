import assert from "node:assert/strict";
import crypto from "node:crypto";
import { HttpClient } from "./http.js";

const client = new HttpClient();

// unique per run so reruns stay green against the same database
const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
const username = `u_${unique}`;
const password = "A sufficiently long password!";

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

  const shortPassword = await client.post("/api/auth/register", { username: `u_${unique}b`, password: "Short!1" });
  assert.equal(shortPassword.status, 422);

  const unknownField = await client.post("/api/auth/register", { username: `u_${unique}c`, password, admin: true });
  assert.equal(unknownField.status, 422);
}

// password policy: long enough, but each of these misses one required
// character class. The message names the missing class rather than
// restating the whole rule.
{
  const noUppercase = await client.post("/api/auth/register", { username: `u_${unique}d`, password: "lowercase-only-1" });
  assert.equal(noUppercase.status, 422);
  const body = noUppercase.body as { errors: Record<string, string> };
  assert.equal(body.errors["password"], "add an uppercase letter");

  const noLowercase = await client.post("/api/auth/register", { username: `u_${unique}e`, password: "UPPERCASE-ONLY-1" });
  assert.equal(noLowercase.status, 422);
  assert.equal((noLowercase.body as { errors: Record<string, string> }).errors["password"], "add a lowercase letter");

  const noSpecial = await client.post("/api/auth/register", { username: `u_${unique}f`, password: "NoSpecialChar1" });
  assert.equal(noSpecial.status, 422);
  assert.equal((noSpecial.body as { errors: Record<string, string> }).errors["password"], "add a special character");

  const onlyDigits = await client.post("/api/auth/register", { username: `u_${unique}g`, password: "12345678" });
  assert.equal(onlyDigits.status, 422);
  assert.equal(
    (onlyDigits.body as { errors: Record<string, string> }).errors["password"],
    "add a lowercase letter, an uppercase letter and a special character",
  );

  // none of the rejected registrations created a user, so the names are free
  const reuse = await client.post("/api/auth/register", { username: `u_${unique}d`, password });
  assert.equal(reuse.status, 201);
}
