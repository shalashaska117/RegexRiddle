// Profile endpoints: /users/me shape, the password change flow, avatar
// upload with the magic byte checks, and the avatar fetch round trip.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { HttpClient } from "./http.js";

const client = new HttpClient();
const anonymous = new HttpClient();

// unique per run so reruns stay green against the same database
const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
const username = `p_${unique}`;
const password = "a sufficiently long password";
const newPassword = "a different long password";

// a real 1x1 transparent PNG; the round trip below compares these bytes
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

// register and log in
let userId: number;
{
  const register = await client.post("/api/auth/register", { username, password });
  assert.equal(register.status, 201);
  userId = (register.body as { id: number }).id;
  const login = await client.post("/api/auth/login", { username, password });
  assert.equal(login.status, 200);
}

// unauthenticated requests get 401
{
  assert.equal((await anonymous.get("/api/users/me")).status, 401);
  assert.equal((await anonymous.patch("/api/users/me", { currentPassword: password, newPassword })).status, 401);
  assert.equal((await anonymous.putFile("/api/users/me/avatar", "avatar", "a.png", "image/png", pngBytes)).status, 401);
}

// own profile, and the same body from /api/auth/me
{
  const res = await client.get("/api/users/me");
  assert.equal(res.status, 200);
  const body = res.body as { id: number; username: string; avatarUrl: string | null; createdAt: string };
  assert.equal(body.id, userId);
  assert.equal(body.username, username);
  assert.equal(body.avatarUrl, null);
  assert.equal(typeof body.createdAt, "string");
  assert.deepEqual(Object.keys(body).sort(), ["avatarUrl", "createdAt", "id", "username"]);

  const authMe = await client.get("/api/auth/me");
  assert.equal(authMe.status, 200);
  assert.deepEqual(authMe.body, res.body);
}

// password change rejections: wrong current password, short new password,
// unknown body field
{
  const wrong = await client.patch("/api/users/me", { currentPassword: "not the password", newPassword });
  assert.equal(wrong.status, 401);
  const short = await client.patch("/api/users/me", { currentPassword: password, newPassword: "short" });
  assert.equal(short.status, 422);
  const stray = await client.patch("/api/users/me", { currentPassword: password, newPassword, admin: true });
  assert.equal(stray.status, 422);
}

// password change, then a login check on both passwords
{
  const res = await client.patch("/api/users/me", { currentPassword: password, newPassword });
  assert.equal(res.status, 204);
  assert.equal(res.body, null);

  const fresh = new HttpClient();
  assert.equal((await fresh.post("/api/auth/login", { username, password })).status, 401);
  const login = await fresh.post("/api/auth/login", { username, password: newPassword });
  assert.equal(login.status, 200);
  assert.equal((login.body as { id: number }).id, userId);
}

// avatar rejections: declared png with the wrong leading bytes, a type
// outside the allowlist, a missing file, and a file over the 1 MB cap
{
  const fakePng = await client.putFile("/api/users/me/avatar", "avatar", "a.png", "image/png", Buffer.from("GIF89a not a png"));
  assert.equal(fakePng.status, 422);
  const fakeBody = fakePng.body as { error: string; errors: Record<string, string> };
  assert.equal(fakeBody.error, "Validation failed");
  assert.equal(typeof fakeBody.errors["avatar"], "string");

  const gif = await client.putFile("/api/users/me/avatar", "avatar", "a.gif", "image/gif", Buffer.from("GIF89a"));
  assert.equal(gif.status, 422);

  const missing = await client.request("PUT", "/api/users/me/avatar");
  assert.equal(missing.status, 422);

  // the multer size cap must come back as 422 JSON, not a 500
  const oversized = Buffer.concat([pngBytes, Buffer.alloc(1024 * 1024)]);
  const tooBig = await client.putFile("/api/users/me/avatar", "avatar", "a.png", "image/png", oversized);
  assert.equal(tooBig.status, 422);
  const bigBody = tooBig.body as { errors: Record<string, string> };
  assert.equal(typeof bigBody.errors["avatar"], "string");
}

// no avatar uploaded yet, so the fetch answers 404
{
  assert.equal((await client.getBytes(`/api/users/${userId}/avatar`)).status, 404);
}

// upload and round trip
{
  const res = await client.putFile("/api/users/me/avatar", "avatar", "me.png", "image/png", pngBytes);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { avatarUrl: `/api/users/${userId}/avatar` });

  const me = await client.get("/api/users/me");
  assert.equal((me.body as { avatarUrl: string }).avatarUrl, `/api/users/${userId}/avatar`);

  // no session needed on the fetch: avatars load from plain img tags
  const image = await anonymous.getBytes(`/api/users/${userId}/avatar`);
  assert.equal(image.status, 200);
  assert.equal(image.contentType, "image/png");
  assert.deepEqual(image.bytes, pngBytes);
}

// a second upload replaces the first; only the magic bytes are checked, so
// a made up RIFF....WEBP payload passes as webp
{
  const webpBytes = Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.from([20, 0, 0, 0]),
    Buffer.from("WEBP"),
    Buffer.from("VP8 fake payload"),
  ]);
  const res = await client.putFile("/api/users/me/avatar", "avatar", "me.webp", "image/webp", webpBytes);
  assert.equal(res.status, 200);

  const image = await client.getBytes(`/api/users/${userId}/avatar`);
  assert.equal(image.status, 200);
  assert.equal(image.contentType, "image/webp");
  assert.deepEqual(image.bytes, webpBytes);
}

// unknown user answers 404, malformed id fails validation
{
  assert.equal((await client.getBytes("/api/users/999999999/avatar")).status, 404);
  assert.equal((await client.getBytes("/api/users/not-a-number/avatar")).status, 422);
}
