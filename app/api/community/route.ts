import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type AppBindings = {
  DB: D1Database;
};

type CommunityQuestRow = {
  id: string;
  author_nickname: string;
  author_stage: string;
  title: string;
  description: string;
  domain: string;
  planned_minutes: number;
  difficulty: string;
  adopted_count: number;
  completed_count: number;
  created_at: string;
};

const domains = new Set([
  "learning",
  "fitness",
  "creation",
  "discipline",
  "social",
  "exploration",
]);

const stageFor = (totalCompletions: number) => {
  if (totalCompletions < 3) return "初次觉醒";
  if (totalCompletions < 12) return "开始行动";
  if (totalCompletions < 30) return "稳定成长";
  if (totalCompletions < 60) return "能力成形";
  if (totalCompletions < 120) return "自我驱动";
  return "长期践行";
};

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === "string"
    ? value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

const publicQuest = (row: CommunityQuestRow) => ({
  id: row.id,
  authorNickname: row.author_nickname,
  authorStage: row.author_stage,
  title: row.title,
  description: row.description,
  domain: row.domain,
  plannedMinutes: row.planned_minutes,
  difficulty: row.difficulty,
  adoptedCount: row.adopted_count,
  completedCount: row.completed_count,
  createdAt: row.created_at,
});

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ signedIn: false }, { status: 401 });
  const { DB } = env as unknown as AppBindings;
  const result = await DB.prepare(
    `SELECT id, author_nickname, author_stage, title, description, domain,
            planned_minutes, difficulty, adopted_count, completed_count, created_at
     FROM community_quests
     WHERE status = 'active'
     ORDER BY completed_count DESC, adopted_count DESC, created_at DESC
     LIMIT 60`,
  ).all<CommunityQuestRow>();
  return Response.json({ quests: result.results.map(publicQuest) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ signedIn: false }, { status: 401 });
  const body = (await request.json()) as {
    quest?: {
      id?: unknown;
      title?: unknown;
      description?: unknown;
      domain?: unknown;
      plannedMinutes?: unknown;
      difficulty?: unknown;
      isCustom?: unknown;
    };
    nickname?: unknown;
    totalCompletions?: unknown;
  };
  const quest = body.quest;
  const sourceQuestId = cleanText(quest?.id, 80);
  const title = cleanText(quest?.title, 30);
  const description = cleanText(quest?.description, 120);
  const nickname = cleanText(body.nickname, 16) || "匿名玩家";
  const domain = typeof quest?.domain === "string" ? quest.domain : "";
  const plannedMinutes = Number(quest?.plannedMinutes);
  const difficulty = quest?.difficulty === "challenge" ? "challenge" : "normal";
  const totalCompletions = Math.max(
    0,
    Math.min(100_000, Number(body.totalCompletions) || 0),
  );
  if (
    quest?.isCustom !== true ||
    sourceQuestId.length < 3 ||
    title.length < 2 ||
    description.length < 4 ||
    !domains.has(domain) ||
    !Number.isInteger(plannedMinutes) ||
    plannedMinutes < 5 ||
    plannedMinutes > 180 ||
    /https?:\/\/|www\./i.test(`${title} ${description}`)
  ) {
    return Response.json({ error: "invalid community quest" }, { status: 400 });
  }

  const { DB } = env as unknown as AppBindings;
  const email = user.email.toLowerCase();
  const recent = await DB.prepare(
    `SELECT COUNT(*) AS count
     FROM community_quests
     WHERE author_email = ? AND datetime(created_at) >= datetime('now', '-1 day')`,
  )
    .bind(email)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= 5) {
    return Response.json({ error: "daily publish limit reached" }, { status: 429 });
  }

  const existing = await DB.prepare(
    `SELECT id, author_nickname, author_stage, title, description, domain,
            planned_minutes, difficulty, adopted_count, completed_count, created_at
     FROM community_quests
     WHERE author_email = ? AND source_quest_id = ?`,
  )
    .bind(email, sourceQuestId)
    .first<CommunityQuestRow>();
  if (existing) return Response.json({ quest: publicQuest(existing), duplicate: true });

  const id = crypto.randomUUID();
  await DB.prepare(
    `INSERT INTO community_quests (
       id, author_email, source_quest_id, author_nickname, author_stage,
       title, description, domain, planned_minutes, difficulty
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      email,
      sourceQuestId,
      nickname,
      stageFor(totalCompletions),
      title,
      description,
      domain,
      plannedMinutes,
      difficulty,
    )
    .run();
  const created = await DB.prepare(
    `SELECT id, author_nickname, author_stage, title, description, domain,
            planned_minutes, difficulty, adopted_count, completed_count, created_at
     FROM community_quests WHERE id = ?`,
  )
    .bind(id)
    .first<CommunityQuestRow>();
  return Response.json({ quest: created ? publicQuest(created) : null }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ signedIn: false }, { status: 401 });
  const body = (await request.json()) as { id?: unknown; action?: unknown };
  const id = cleanText(body.id, 80);
  const action = body.action;
  if (!id || !["adopt", "complete", "report"].includes(String(action))) {
    return Response.json({ error: "invalid action" }, { status: 400 });
  }
  const { DB } = env as unknown as AppBindings;
  const email = user.email.toLowerCase();

  if (action === "adopt" || action === "complete") {
    const table =
      action === "adopt"
        ? "community_quest_adoptions"
        : "community_quest_completions";
    const column = action === "adopt" ? "adopted_count" : "completed_count";
    const inserted = await DB.prepare(
      `INSERT OR IGNORE INTO ${table} (quest_id, user_email) VALUES (?, ?)`,
    )
      .bind(id, email)
      .run();
    if ((inserted.meta.changes ?? 0) > 0) {
      await DB.prepare(
        `UPDATE community_quests SET ${column} = ${column} + 1 WHERE id = ?`,
      )
        .bind(id)
        .run();
    }
    return Response.json({ updated: true, counted: (inserted.meta.changes ?? 0) > 0 });
  }

  await DB.prepare(
    "INSERT OR IGNORE INTO community_quest_reports (quest_id, user_email) VALUES (?, ?)",
  )
    .bind(id, email)
    .run();
  const reports = await DB.prepare(
    "SELECT COUNT(*) AS count FROM community_quest_reports WHERE quest_id = ?",
  )
    .bind(id)
    .first<{ count: number }>();
  if ((reports?.count ?? 0) >= 3) {
    await DB.prepare(
      "UPDATE community_quests SET status = 'review' WHERE id = ?",
    )
      .bind(id)
      .run();
  }
  return Response.json({ reported: true });
}
