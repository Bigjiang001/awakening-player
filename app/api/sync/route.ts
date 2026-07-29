import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type AppBindings = {
  DB: D1Database;
  FILES: R2Bucket;
};

const bindings = () => env as unknown as AppBindings;

const objectKeyFor = async (email: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(email.toLowerCase()),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `player-saves/${hash}.json`;
};

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ signedIn: false }, { status: 401 });
  }
  const { DB, FILES } = bindings();
  const record = await DB.prepare(
    "SELECT object_key, updated_at FROM player_saves WHERE user_email = ?",
  )
    .bind(user.email.toLowerCase())
    .first<{ object_key: string; updated_at: string }>();
  if (!record) {
    return Response.json({
      signedIn: true,
      displayName: user.displayName,
      state: null,
    });
  }
  const object = await FILES.get(record.object_key);
  if (!object) {
    return Response.json({
      signedIn: true,
      displayName: user.displayName,
      state: null,
    });
  }
  return Response.json({
    signedIn: true,
    displayName: user.displayName,
    state: await object.json(),
    updatedAt: record.updated_at,
  });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ signedIn: false }, { status: 401 });
  }
  const body = (await request.json()) as {
    state?: unknown;
    updatedAt?: string;
  };
  if (
    !body.state ||
    typeof body.state !== "object" ||
    typeof body.updatedAt !== "string"
  ) {
    return Response.json({ error: "invalid save" }, { status: 400 });
  }
  const serialized = JSON.stringify(body.state);
  if (serialized.length > 25_000_000) {
    return Response.json({ error: "save is too large" }, { status: 413 });
  }
  const email = user.email.toLowerCase();
  const key = await objectKeyFor(email);
  const { DB, FILES } = bindings();
  await FILES.put(key, serialized, {
    httpMetadata: { contentType: "application/json" },
  });
  await DB.prepare(
    `INSERT INTO player_saves (user_email, object_key, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_email) DO UPDATE SET
       object_key = excluded.object_key,
       updated_at = excluded.updated_at`,
  )
    .bind(email, key, body.updatedAt)
    .run();
  return Response.json({
    saved: true,
    updatedAt: body.updatedAt,
    displayName: user.displayName,
  });
}

export async function DELETE() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ signedIn: false }, { status: 401 });
  }
  const email = user.email.toLowerCase();
  const { DB, FILES } = bindings();
  const record = await DB.prepare(
    "SELECT object_key FROM player_saves WHERE user_email = ?",
  )
    .bind(email)
    .first<{ object_key: string }>();
  if (record) await FILES.delete(record.object_key);
  await DB.prepare("DELETE FROM player_saves WHERE user_email = ?")
    .bind(email)
    .run();
  return Response.json({ deleted: true });
}
