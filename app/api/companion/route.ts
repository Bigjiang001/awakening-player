import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type AppBindings = {
  DB: D1Database;
  FILES: R2Bucket;
};

const bindings = () => env as unknown as AppBindings;

const makeCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((value) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[value % 32])
    .join("");

const partnerSummary = async (
  FILES: R2Bucket,
  DB: D1Database,
  email: string,
) => {
  const save = await DB.prepare(
    "SELECT object_key FROM player_saves WHERE user_email = ?",
  )
    .bind(email)
    .first<{ object_key: string }>();
  if (!save) return { nickname: "同行者", completions: 0, activeToday: false };
  const object = await FILES.get(save.object_key);
  const state = object
    ? ((await object.json()) as {
        profile?: { nickname?: string; totalCompletions?: number };
        sessions?: Array<{ status?: string; completedAt?: string }>;
      })
    : {};
  const today = new Date().toISOString().slice(0, 10);
  return {
    nickname: state.profile?.nickname ?? "同行者",
    completions: state.profile?.totalCompletions ?? 0,
    activeToday:
      state.sessions?.some(
        (session) =>
          session.status === "completed" &&
          session.completedAt?.slice(0, 10) === today,
      ) ?? false,
  };
};

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ signedIn: false }, { status: 401 });
  const email = user.email.toLowerCase();
  const { DB, FILES } = bindings();
  const link = await DB.prepare(
    `SELECT code, owner_email, partner_email
     FROM companion_links
     WHERE owner_email = ? OR partner_email = ?
     LIMIT 1`,
  )
    .bind(email, email)
    .first<{
      code: string;
      owner_email: string;
      partner_email: string | null;
    }>();
  if (!link) return Response.json({ signedIn: true, link: null });
  const partnerEmail =
    link.owner_email === email ? link.partner_email : link.owner_email;
  return Response.json({
    signedIn: true,
    link: {
      code: link.code,
      waiting: !partnerEmail,
      partner: partnerEmail
        ? await partnerSummary(FILES, DB, partnerEmail)
        : null,
    },
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ signedIn: false }, { status: 401 });
  const email = user.email.toLowerCase();
  const body = (await request.json()) as {
    action?: "create" | "join" | "leave";
    code?: string;
  };
  const { DB } = bindings();
  if (body.action === "leave") {
    await DB.prepare(
      "DELETE FROM companion_links WHERE owner_email = ? OR partner_email = ?",
    )
      .bind(email, email)
      .run();
    return Response.json({ ok: true });
  }
  const existing = await DB.prepare(
    "SELECT code FROM companion_links WHERE owner_email = ? OR partner_email = ?",
  )
    .bind(email, email)
    .first();
  if (existing) {
    return Response.json({ error: "already linked" }, { status: 409 });
  }
  if (body.action === "create") {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const code = makeCode();
      try {
        await DB.prepare(
          "INSERT INTO companion_links (code, owner_email) VALUES (?, ?)",
        )
          .bind(code, email)
          .run();
        return Response.json({ ok: true, code });
      } catch {
        // Retry a rare invitation-code collision.
      }
    }
    return Response.json({ error: "code unavailable" }, { status: 500 });
  }
  if (body.action === "join" && body.code) {
    const result = await DB.prepare(
      `UPDATE companion_links
       SET partner_email = ?, joined_at = CURRENT_TIMESTAMP
       WHERE code = ? AND partner_email IS NULL AND owner_email != ?`,
    )
      .bind(email, body.code.trim().toUpperCase(), email)
      .run();
    if (!result.meta.changes) {
      return Response.json({ error: "invalid code" }, { status: 404 });
    }
    return Response.json({ ok: true });
  }
  return Response.json({ error: "invalid action" }, { status: 400 });
}
