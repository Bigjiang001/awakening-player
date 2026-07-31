import {
  DAILY_ENCOUNTERS,
  DOMAIN_META,
  DOMAIN_ORDER,
  EQUIPMENT_CARDS,
  GROWTH_NODES,
  RECOVERY_ACTIONS,
  RESTART_QUESTS,
  WEEKLY_BOSSES,
} from "../data/game-data";
import type {
  DailyAwakeningPlan,
  Domain,
  EquipmentCard,
  GameState,
  GrowthExpedition,
  GrowthNode,
  GrowthStage,
  Quest,
  RecoverySession,
  TaskSession,
  WeeklyBoss,
} from "./types";

export const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const elapsedSeconds = (
  session: TaskSession,
  now = Date.now(),
): number =>
  Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));

export const recoveryElapsedSeconds = (
  session: RecoverySession,
  now = Date.now(),
) =>
  Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));

export const canCompleteSession = (
  session: TaskSession,
): boolean => session.status === "active";

export const hasReachedSessionReference = (
  session: TaskSession,
  now = Date.now(),
): boolean =>
  session.timingMode === "result" ||
  elapsedSeconds(session, now) >= session.plannedMinutes * 60;

export const formatDuration = (seconds: number, showHours = true) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0 && showHours) {
    return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
  }
  return [m + h * 60, s]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

export const formatMinutes = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
};

export const getQuest = (state: GameState, questId: string) =>
  state.quests.find((quest) => quest.id === questId);

export const localDateKey = (value: Date | string | number = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isRestartQuest = (quest: Pick<Quest, "id">) =>
  quest.id.startsWith("restart-");

export const isCourageQuest = (quest: Quest) =>
  quest.id.startsWith("courage-");

export const isBossQuest = (quest: Quest) =>
  quest.id.startsWith("boss-");

export const questUsesReferenceTime = (
  quest: Pick<Quest, "id" | "domain">,
) =>
  isRestartQuest(quest) ||
  quest.domain === "learning" ||
  quest.domain === "fitness";

export const completionExperienceReward = (quest: Quest) => {
  if (isRestartQuest(quest)) return 8;
  if (isBossQuest(quest)) return 60;
  return quest.difficulty === "challenge" ? 35 : 20;
};

export const playerLevelFromExperience = (experience: number) =>
  Math.max(1, Math.floor(Math.max(0, experience) / 100) + 1);

export const levelProgress = (experience: number) => ({
  current: Math.max(0, experience) % 100,
  required: 100,
  ratio: (Math.max(0, experience) % 100) / 100,
});

export const questUnlockLevel = (quest: Quest) => {
  if (isBossQuest(quest)) return 5;
  if (quest.difficulty === "challenge") return 3;
  if (quest.tags?.includes("seasonal")) return 2;
  return 1;
};

export const equipmentCollection = (state: GameState) =>
  EQUIPMENT_CARDS.map((equipment): EquipmentCard & { unlocked: boolean } => ({
    ...equipment,
    unlocked:
      (state.profile?.level ?? 1) >= equipment.unlockLevel &&
      domainStats(state, equipment.domain).completions >= equipment.unlockCount,
  }));

export const weekKey = (value: Date | string | number = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return localDateKey(date);
};

export const weeklyBossFor = (
  state: GameState,
  value: Date | string | number = new Date(),
): WeeklyBoss => {
  const level = state.profile?.level ?? 1;
  const available = WEEKLY_BOSSES.filter((boss) => boss.minLevel <= level);
  const key = weekKey(value);
  const seed = Number(key.replaceAll("-", ""));
  return available[seed % Math.max(1, available.length)] ?? WEEKLY_BOSSES[0];
};

export const weeklyBossProgress = (
  state: GameState,
  boss: WeeklyBoss,
  value: Date | string | number = new Date(),
) => {
  const week = weekKey(value);
  return Math.min(
    boss.targetCount,
    state.sessions.filter((session) => {
      if (
        session.status !== "completed" ||
        !session.completedAt ||
        weekKey(session.completedAt) !== week
      ) {
        return false;
      }
      const quest = getQuest(state, session.questId);
      return Boolean(quest && boss.domains.includes(quest.domain));
    }).length,
  );
};

export const isRestDay = (value: Date | string | number = new Date()) =>
  new Date(value).getDay() === 0;

export const dailyEncounterFor = (
  state: GameState,
  value: Date | string | number = new Date(),
) => {
  const key = localDateKey(value);
  const seed = Number(key.replaceAll("-", ""));
  const ordered = DAILY_ENCOUNTERS.map(
    (encounter, index) =>
      DAILY_ENCOUNTERS[(seed + index) % DAILY_ENCOUNTERS.length],
  );
  const selected = ordered.find((encounter) =>
    state.quests.some((quest) => quest.id === encounter.questId),
  );
  if (!selected) return undefined;
  const quest = getQuest(state, selected.questId);
  if (!quest) return undefined;
  const completed = state.sessions.some(
    (session) =>
      session.questId === quest.id &&
      session.status === "completed" &&
      session.completedAt &&
      localDateKey(session.completedAt) === key,
  );
  return { ...selected, quest, completed };
};

export const questCompletionCount = (state: GameState, questId: string) =>
  state.sessions.filter(
    (session) =>
      session.questId === questId && session.status === "completed",
  ).length;

export const MASTERY_RANKS = [
  { minimum: 0, title: "初识" },
  { minimum: 1, title: "起步" },
  { minimum: 3, title: "坚持" },
  { minimum: 7, title: "稳定" },
  { minimum: 15, title: "熟练" },
  { minimum: 30, title: "深耕" },
  { minimum: 60, title: "精进" },
  { minimum: 100, title: "长期践行" },
] as const;

export const questMastery = (state: GameState, questId: string) => {
  const count = questCompletionCount(state, questId);
  const rank =
    [...MASTERY_RANKS].reverse().find((item) => count >= item.minimum) ??
    MASTERY_RANKS[0];
  const next = MASTERY_RANKS.find((item) => item.minimum > count);
  return { count, rank, next };
};

export const suggestedFirstStep = (quest: Quest) => {
  if (isRestartQuest(quest)) return quest.description;
  switch (quest.domain) {
    case "learning":
      return "打开资料，写下这次要回答的一个问题";
    case "fitness":
      return "确认身体状态与安全空间，完成轻柔热身";
    case "creation":
      return "打开作品文件，先做一个看得见的小改动";
    case "discipline":
      return "移开一个干扰，把第一件需要的物品放到眼前";
    case "social":
      return "写下第一句话，确认合适的对象和时机";
    case "exploration":
      return "确认安全与可靠信息来源，然后迈出第一步";
  }
};

export const safetyGuidance = (quest: Quest) => {
  switch (quest.domain) {
    case "fitness":
      return "运动以身体安全为先；出现疼痛、眩晕或明显不适，请立即停止。";
    case "social":
      return "尊重彼此意愿与隐私；被拒绝、没有回应或结果不完美，也算完成了真实表达。";
    case "exploration":
      return "优先查阅官方或可靠来源；驾驶、骑行和过马路时不要操作手机。";
    default:
      return "现实第一步只负责降低启动阻力，本身不会提前增加属性。";
  }
};

const completedWithQuest = (state: GameState) =>
  state.sessions
    .filter(
      (session) =>
        session.status === "completed" &&
        typeof session.finalDurationSeconds === "number",
    )
    .flatMap((session) => {
      const quest = getQuest(state, session.questId);
      return quest ? [{ session, quest }] : [];
    });

export const reconcileProgress = (state: GameState): GameState => {
  if (!state.profile) return state;
  const completed = completedWithQuest(state);
  const experience = completed.reduce(
    (sum, { session, quest }) =>
      sum + (session.experienceEarned ?? completionExperienceReward(quest)),
    0,
  );
  const attributes = {
    intelligence: 0,
    strength: 0,
    creativity: 0,
    willpower: 0,
    charisma: 0,
    perception: 0,
  };
  for (const { quest } of completed) {
    attributes[DOMAIN_META[quest.domain].attributeKey] += 1;
  }
  return {
    ...state,
    profile: {
      ...state.profile,
      attributes,
      totalCompletions: completed.length,
      totalActionSeconds: completed.reduce(
        (sum, { session }) => sum + (session.finalDurationSeconds ?? 0),
        0,
      ),
      actionPoints: state.profile.actionPoints ?? 0,
      experience,
      level: playerLevelFromExperience(experience),
    },
    activeSessionId:
      state.activeSessionId &&
      state.sessions.some(
        (session) =>
          session.id === state.activeSessionId && session.status === "active",
      )
        ? state.activeSessionId
        : null,
    activeRecoveryId:
      state.activeRecoveryId &&
      state.recoverySessions.some(
        (session) =>
          session.id === state.activeRecoveryId && session.status === "active",
      )
        ? state.activeRecoveryId
        : null,
  };
};

export const domainStats = (state: GameState, domain: Domain) => {
  const completed = completedWithQuest(state).filter(
    ({ quest }) => quest.domain === domain,
  );
  return {
    completions: completed.length,
    seconds: completed.reduce(
      (sum, { session }) => sum + (session.finalDurationSeconds ?? 0),
      0,
    ),
    challenges: completed.filter(
      ({ quest }) => quest.difficulty === "challenge",
    ).length,
    records: state.memories.filter(
      (memory) =>
        memory.domain === domain &&
        Boolean(memory.note || memory.photoDataUrl),
    ).length,
  };
};

export const activeExpedition = (state: GameState) =>
  [...state.expeditions].reverse().find((expedition) => !expedition.claimedAt);

export const expeditionProgress = (
  state: GameState,
  expedition: GrowthExpedition,
) =>
  Math.min(
    expedition.targetCount,
    Math.max(
      0,
      domainStats(state, expedition.domain).completions -
        expedition.baselineCount,
    ),
  );

export const suggestedExpeditionDomain = (state: GameState): Domain =>
  [...DOMAIN_ORDER].sort(
    (left, right) =>
      domainStats(state, left).completions -
      domainStats(state, right).completions,
  )[0];

export const activeCourageLadder = (state: GameState) =>
  [...state.courageLadders].reverse().find((ladder) => !ladder.claimedAt);

export const courageLadderProgress = (
  state: GameState,
  stepQuestIds: readonly string[],
) => stepQuestIds.filter((questId) => questCompletionCount(state, questId)).length;

export const activeCampaign = (state: GameState) =>
  [...state.campaigns].reverse().find((campaign) => !campaign.claimedAt);

export const campaignProgress = (
  state: GameState,
  campaign: GameState["campaigns"][number],
) =>
  Math.min(
    campaign.targetCount,
    Math.max(
      0,
      domainStats(state, campaign.domain).completions -
        campaign.baselineCount,
    ),
  );

export const contextualQuest = (state: GameState) => {
  const context = state.actionContext;
  const campaign = activeCampaign(state);
  const kindTag = {
    fitness: "fat-loss",
    english: "english",
    career: "upgrade",
    creation: "creative",
    rhythm: "upgrade",
    custom: "popular",
  }[campaign?.kind ?? "custom"];
  const candidates = state.quests
    .filter(
      (quest) =>
        !isRestartQuest(quest) &&
        !isCourageQuest(quest) &&
        !isBossQuest(quest) &&
        (state.launchMinutes[quest.id] ?? quest.plannedMinutes) <=
          context.minutes &&
        (context.energy === "high" || quest.difficulty !== "challenge"),
    )
    .map((quest) => {
      let score = 0;
      if (campaign && quest.domain === campaign.domain) score += 8;
      if (quest.tags?.includes(kindTag as never)) score += 5;
      if (quest.tags?.includes("popular")) score += 2;
      if (context.energy === "low" && quest.plannedMinutes <= 10) score += 3;
      if (context.place === "outdoor" && ["fitness", "exploration"].includes(quest.domain)) score += 3;
      if (context.place === "commute" && ["learning", "social"].includes(quest.domain)) score += 2;
      score -= questCompletionCount(state, quest.id) * 0.05;
      return { quest, score };
    })
    .sort((left, right) => right.score - left.score);
  return candidates[0]?.quest ?? suggestedQuest(state);
};

export const isNodeUnlocked = (
  state: GameState,
  node: GrowthNode,
): boolean => {
  const stats = domainStats(state, node.domain);
  switch (node.requirementType) {
    case "completionCount":
      return stats.completions >= node.requirementValue;
    case "totalMinutes":
      return stats.seconds >= node.requirementValue * 60;
    case "challengeCount":
      return stats.challenges >= node.requirementValue;
    case "manualRecord":
      return stats.records >= node.requirementValue;
  }
};

export const getUnlockedNodeCount = (state: GameState) =>
  GROWTH_NODES.filter((node) => isNodeUnlocked(state, node)).length;

export const getGrowthStage = (state: GameState): GrowthStage => {
  const completions = state.profile?.totalCompletions ?? 0;
  const actionDays = new Set(
    state.sessions
      .filter((session) => session.status === "completed" && session.completedAt)
      .map((session) => session.completedAt!.slice(0, 10)),
  ).size;
  const challengeCount = completedWithQuest(state).filter(
    ({ quest }) => quest.difficulty === "challenge",
  ).length;
  const activeDomains = DOMAIN_ORDER.filter(
    (domain) => domainStats(state, domain).completions > 0,
  ).length;

  if (completions >= 60 && activeDomains >= 3) {
    return {
      name: "稳定成长",
      eyebrow: "你的世界已有自己的节律",
      description: "真实行动已成为你生活的一部分。",
      nextHint: "继续走下去，新的阶段会在路上出现。",
    };
  }
  if (completions >= 30 && challengeCount >= 1) {
    return {
      name: "突破边界",
      eyebrow: "你曾主动走进困难",
      description: "一次次跨越，正在拓宽人生边界。",
      nextHint: `发展 3 个领域并累计完成 60 次，进入下一阶段。`,
    };
  }
  if (completions >= 12 && actionDays >= 4) {
    return {
      name: "建立节奏",
      eyebrow: "行动开始拥有节律",
      description: "你不再只靠一时冲动，而是在建立自己的节奏。",
      nextHint: `再完成 ${Math.max(0, 30 - completions)} 次，并完成 1 次挑战。`,
    };
  }
  if (completions >= 3) {
    return {
      name: "开始行动",
      eyebrow: "想法已经落在现实",
      description: "真正的成长，从一次愿意开始的行动发生。",
      nextHint: `累计 12 次，并在至少 4 天行动，建立稳定节奏。`,
    };
  }
  return {
    name: "初次觉醒",
    eyebrow: "世界正等待你的第一步",
    description: "不需要准备完美，只需要完成一件真实的小事。",
    nextHint: `再完成 ${Math.max(0, 3 - completions)} 次，进入“开始行动”。`,
  };
};

export const worldStateFor = (
  state: GameState,
  domain: Domain,
): "silent" | "lit" | "built" => {
  const count = domainStats(state, domain).completions;
  if (count >= 5) return "built";
  if (count >= 1) return "lit";
  return "silent";
};

export const suggestedQuest = (state: GameState): Quest => {
  const leastDeveloped = [...DOMAIN_ORDER].sort(
    (a, b) =>
      domainStats(state, a).completions - domainStats(state, b).completions,
  )[0];
  return (
    state.quests.find(
      (quest) =>
        quest.domain === leastDeveloped &&
        !isBossQuest(quest) &&
        quest.difficulty === "normal" &&
        quest.plannedMinutes <= 15,
    ) ?? state.quests[0]
  );
};

const PILLARS: Array<{ name: "心智" | "身体" | "破界"; domains: Domain[] }> = [
  { name: "心智", domains: ["learning", "creation"] },
  { name: "身体", domains: ["fitness", "discipline"] },
  { name: "破界", domains: ["social", "exploration"] },
];

export const dailyPlanFor = (
  state: GameState,
  dateKey = localDateKey(),
): DailyAwakeningPlan | undefined =>
  state.dailyPlans.find((plan) => plan.date === dateKey);

export const buildDailyPlan = (
  state: GameState,
  now = new Date(),
): DailyAwakeningPlan => {
  const date = localDateKey(now);
  const numericDay = Number(date.replaceAll("-", ""));
  const mainDomain = mainlineDomain(state.profile?.mainGoal ?? "");
  const questIds = PILLARS.map((pillar, pillarIndex) => {
    const weakest =
      pillarIndex === 0
        ? mainDomain
        : [...pillar.domains].sort(
            (a, b) =>
              domainStats(state, a).completions -
              domainStats(state, b).completions,
          )[0];
    const candidates = state.quests.filter(
      (quest) =>
        quest.domain === weakest &&
        !isRestartQuest(quest) &&
        !isBossQuest(quest) &&
        quest.difficulty === "normal" &&
        quest.plannedMinutes <= 25,
    );
    const fallback = state.quests.filter(
      (quest) =>
        pillar.domains.includes(quest.domain) &&
        !isRestartQuest(quest) &&
        !isBossQuest(quest),
    );
    const pool = candidates.length ? candidates : fallback;
    return pool[(numericDay + pillarIndex) % pool.length]?.id ?? state.quests[0].id;
  }) as [string, string, string];
  return { date, questIds, createdAt: now.toISOString() };
};

export const dailyPlanItems = (state: GameState, plan: DailyAwakeningPlan) =>
  PILLARS.flatMap((pillar, index) => {
    const quest = getQuest(state, plan.questIds[index]);
    if (!quest) return [];
    const completed = state.sessions.some(
      (session) =>
        session.questId === quest.id &&
        session.status === "completed" &&
        session.completedAt &&
        localDateKey(session.completedAt) === plan.date,
    );
    return [{ pillar: pillar.name, quest, completed }];
  });

export const suggestedRestartQuest = (state: GameState) => {
  const weakest = [...DOMAIN_ORDER].sort(
    (a, b) =>
      domainStats(state, a).completions - domainStats(state, b).completions,
  )[0];
  return RESTART_QUESTS.find((quest) => quest.domain === weakest)!;
};

export const completedRestartToday = (state: GameState) =>
  state.sessions.some(
    (session) =>
      session.status === "completed" &&
      session.completedAt &&
      localDateKey(session.completedAt) === localDateKey() &&
      session.questId.startsWith("restart-"),
  );

export const activeDayKeys = (state: GameState) =>
  new Set(
    state.sessions
      .filter((session) => session.status === "completed" && session.completedAt)
      .map((session) => localDateKey(session.completedAt!)),
  );

export const actionStreaks = (state: GameState) => {
  const days = [...activeDayKeys(state)].sort();
  let longest = 0;
  let run = 0;
  let previous: Date | undefined;
  for (const key of days) {
    const current = new Date(`${key}T12:00:00`);
    const distance = previous
      ? Math.round((current.getTime() - previous.getTime()) / 86_400_000)
      : 1;
    run = distance === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = current;
  }

  let current = 0;
  const cursor = new Date();
  const today = localDateKey(cursor);
  if (!days.includes(today)) cursor.setDate(cursor.getDate() - 1);
  while (activeDayKeys(state).has(localDateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest, activeDays: days.length };
};

export const weekStartKey = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return localDateKey(start);
};

export const weeklySnapshot = (state: GameState, date = new Date()) => {
  const start = new Date(`${weekStartKey(date)}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const completed = state.sessions.filter((session) => {
    if (session.status !== "completed" || !session.completedAt) return false;
    const time = new Date(session.completedAt);
    return time >= start && time < end;
  });
  const recovery = state.recoverySessions.filter((session) => {
    if (session.status !== "completed" || !session.completedAt) return false;
    const time = new Date(session.completedAt);
    return time >= start && time < end;
  });
  const ordered = [...DOMAIN_ORDER].sort(
    (a, b) =>
      domainStats(state, a).completions - domainStats(state, b).completions,
  );
  return {
    weekStart: localDateKey(start),
    completedQuestCount: completed.length,
    activeDayCount: new Set(
      completed.map((session) => localDateKey(session.completedAt!)),
    ).size,
    actionSeconds: completed.reduce(
      (sum, session) => sum + (session.finalDurationSeconds ?? 0),
      0,
    ),
    recoveryActionCount: recovery.length,
    growthDomain: ordered[0],
    strongestDomain: ordered[ordered.length - 1],
  };
};

export const mainlineDomain = (goal: string): Domain => {
  if (goal.includes("学习")) return "learning";
  if (goal.includes("身体") || goal.includes("力量")) return "fitness";
  if (goal.includes("作品") || goal.includes("创作")) return "creation";
  if (goal.includes("可能") || goal.includes("探索")) return "exploration";
  if (goal.includes("连接") || goal.includes("社交")) return "social";
  return "discipline";
};

export const mainlineProgress = (state: GameState) => {
  const domain = mainlineDomain(state.profile?.mainGoal ?? "");
  const count = domainStats(state, domain).completions;
  const milestones = [6, 12, 30, 60];
  const next = milestones.find((milestone) => count < milestone);
  const previous = [...milestones].reverse().find((milestone) => count >= milestone) ?? 0;
  return {
    domain,
    count,
    previous,
    next,
    progress: next
      ? Math.min(1, (count - previous) / Math.max(1, next - previous))
      : 1,
  };
};

export const canCompleteRecovery = (
  session: RecoverySession,
  now = Date.now(),
) => {
  const action = RECOVERY_ACTIONS.find((item) => item.id === session.actionId);
  return Boolean(
    action &&
      session.status === "active" &&
      recoveryElapsedSeconds(session, now) >= action.minutes * 60,
  );
};

export const recoveryReadiness = (state: GameState) => {
  const today = localDateKey();
  const focusedToday = state.sessions
    .filter(
      (session) =>
        session.status === "completed" &&
        session.completedAt &&
        localDateKey(session.completedAt) === today,
    )
    .reduce((sum, session) => sum + (session.finalDurationSeconds ?? 0), 0);
  const recoveryToday = state.recoverySessions.filter(
    (session) =>
      session.status === "completed" &&
      session.completedAt &&
      localDateKey(session.completedAt) === today,
  ).length;
  const score = Math.max(
    20,
    Math.min(100, 92 - Math.floor(focusedToday / 1800) * 9 + recoveryToday * 12),
  );
  if (score <= 35) {
    return {
      score,
      title: "优先恢复",
      guidance: "今天已经投入很多。真正的变强，也包括及时停下来恢复。",
      focusedToday,
      recoveryToday,
    };
  }
  if (score <= 65) {
    return {
      score,
      title: "建议恢复",
      guidance: "先完成一个短恢复，再决定是否继续下一项行动。",
      focusedToday,
      recoveryToday,
    };
  }
  return {
    score,
    title: "精力稳定",
    guidance: "保持觉察，不必把每一分钟都塞满。",
    focusedToday,
    recoveryToday,
  };
};

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  mark: string;
  tier: "bronze" | "silver" | "gold";
  unlocked: boolean;
};

export const achievementsFor = (state: GameState): AchievementDefinition[] => {
  const total = state.profile?.totalCompletions ?? 0;
  const seconds = state.profile?.totalActionSeconds ?? 0;
  const challengeCount = completedWithQuest(state).filter(
    ({ quest }) => quest.difficulty === "challenge",
  ).length;
  const domainCounts = Object.fromEntries(
    DOMAIN_ORDER.map((domain) => [domain, domainStats(state, domain).completions]),
  ) as Record<Domain, number>;
  const allAwake = DOMAIN_ORDER.every((domain) => domainCounts[domain] > 0);

  return [
    {
      id: "first-action",
      title: "现实第一步",
      description: "正式完成第一次现实任务",
      mark: "始",
      tier: "bronze",
      unlocked: total >= 1,
    },
    {
      id: "action-begins",
      title: "开始行动",
      description: "累计完成 3 次现实任务",
      mark: "行",
      tier: "bronze",
      unlocked: total >= 3,
    },
    {
      id: "six-awake",
      title: "六域初醒",
      description: "六块人生地图都完成过真实行动",
      mark: "六",
      tier: "silver",
      unlocked: allAwake,
    },
    {
      id: "first-challenge",
      title: "越过边界",
      description: "完成第一次挑战任务",
      mark: "破",
      tier: "silver",
      unlocked: challengeCount >= 1,
    },
    {
      id: "one-hour",
      title: "专注成流",
      description: "累计真实行动 60 分钟",
      mark: "流",
      tier: "bronze",
      unlocked: seconds >= 3600,
    },
    {
      id: "rhythm",
      title: "建立节奏",
      description: "累计完成 12 次现实任务",
      mark: "律",
      tier: "silver",
      unlocked: total >= 12,
    },
    ...DOMAIN_ORDER.map(
      (domain): AchievementDefinition => ({
        id: `domain-${domain}-10`,
        title: `${DOMAIN_META[domain].attribute}成形`,
        description: `${DOMAIN_META[domain].name}领域完成 10 次行动`,
        mark: DOMAIN_META[domain].mark,
        tier: "silver",
        unlocked: domainCounts[domain] >= 10,
      }),
    ),
    {
      id: "thirty-actions",
      title: "突破边界",
      description: "累计完成 30 次现实任务",
      mark: "越",
      tier: "gold",
      unlocked: total >= 30,
    },
    {
      id: "sixty-actions",
      title: "稳定成长",
      description: "累计完成 60 次现实任务",
      mark: "恒",
      tier: "gold",
      unlocked: total >= 60,
    },
  ];
};

export const completionPointReward = (quest: Quest) => {
  if (isRestartQuest(quest)) return 3;
  return quest.difficulty === "challenge" ? 8 : 5;
};

export const masteryPointBonus = (completionCount: number) => {
  const milestones: Record<number, number> = {
    3: 5,
    7: 10,
    15: 15,
    30: 25,
    60: 40,
    100: 60,
  };
  return milestones[completionCount] ?? 0;
};
