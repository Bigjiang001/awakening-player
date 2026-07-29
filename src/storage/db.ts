import {
  DEFAULT_QUESTS,
  DEFAULT_REAL_REWARDS,
  RESTART_QUESTS,
} from "../data/game-data";
import { reconcileProgress } from "../domain/rules";
import type { Domain, GameState, Quest } from "../domain/types";

const DATABASE_NAME = "awakening-player";
const DATABASE_VERSION = 1;
const STORE_NAME = "game";
const STATE_KEY = "current";

export const createEmptyState = (): GameState => ({
  version: 1,
  profile: null,
  quests: [...DEFAULT_QUESTS, ...RESTART_QUESTS],
  sessions: [],
  memories: [],
  activeSessionId: null,
  launchPlans: {},
  launchMinutes: {},
  dailyPlans: [],
  weeklyReviews: [],
  recoverySessions: [],
  activeRecoveryId: null,
  realRewards: DEFAULT_REAL_REWARDS,
  rewardRedemptions: [],
  rewardedSessionIds: [],
  expeditions: [],
  courageLadders: [],
  campaigns: [],
  actionContext: {
    minutes: 15,
    energy: "steady",
    place: "home",
    updatedAt: "1970-01-01T00:00:00.000Z",
  },
  actionTriggers: [],
  metrics: {
    launches: 0,
    recommendationStarts: 0,
  },
  lastModifiedAt: "1970-01-01T00:00:00.000Z",
  settings: {
    sound: true,
    haptics: true,
    reducedMotion: false,
  },
});

export const normalizeGame = (state: GameState): GameState => {
  const knownIds = new Set((state.quests ?? []).map((quest) => quest.id));
  const catalog = [...DEFAULT_QUESTS, ...RESTART_QUESTS];
  const catalogById = new Map(catalog.map((quest) => [quest.id, quest]));
  const mergedQuests = [
    ...(state.quests ?? []).map((quest) => {
      const catalogQuest = catalogById.get(quest.id);
      if (catalogQuest) return catalogQuest;
      if (
        quest.id.startsWith("courage-") &&
        quest.title === "完成五分钟试启动"
      ) {
        return { ...quest, title: "完成一次试启动" };
      }
      return quest;
    }),
    ...catalog.filter((quest) => !knownIds.has(quest.id)),
  ];
  const knownRewardIds = new Set(
    (state.realRewards ?? []).map((reward) => reward.id),
  );
  const mergedRewards = [
    ...(state.realRewards ?? []),
    ...DEFAULT_REAL_REWARDS.filter(
      (reward) => !knownRewardIds.has(reward.id),
    ),
  ];
  const normalized: GameState = {
    ...createEmptyState(),
    ...state,
    quests: mergedQuests,
    sessions: state.sessions ?? [],
    memories: (state.memories ?? []).map((memory) => {
      const catalogQuest = catalogById.get(memory.questId);
      return catalogQuest && memory.questTitle !== catalogQuest.title
        ? { ...memory, questTitle: catalogQuest.title }
        : memory;
    }),
    launchPlans: state.launchPlans ?? {},
    launchMinutes: state.launchMinutes ?? {},
    dailyPlans: state.dailyPlans ?? [],
    weeklyReviews: state.weeklyReviews ?? [],
    recoverySessions: state.recoverySessions ?? [],
    expeditions: state.expeditions ?? [],
    courageLadders: state.courageLadders ?? [],
    campaigns: state.campaigns ?? [],
    actionContext: state.actionContext ?? createEmptyState().actionContext,
    actionTriggers: state.actionTriggers ?? [],
    metrics: state.metrics ?? createEmptyState().metrics,
    lastModifiedAt:
      state.lastModifiedAt ??
      state.profile?.createdAt ??
      "1970-01-01T00:00:00.000Z",
    realRewards: mergedRewards,
    rewardRedemptions: state.rewardRedemptions ?? [],
    rewardedSessionIds:
      state.rewardedSessionIds ??
      (state.sessions ?? [])
        .filter((session) => session.status === "completed")
        .map((session) => session.id),
    activeRecoveryId:
      state.activeRecoveryId &&
      (state.recoverySessions ?? []).some(
        (session) =>
          session.id === state.activeRecoveryId && session.status === "active",
      )
        ? state.activeRecoveryId
        : null,
  };
  return reconcileProgress(normalized);
};

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionRequest = <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) =>
  openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const request = action(transaction.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => reject(transaction.error);
      }),
  );

export const loadGame = async (): Promise<GameState> => {
  const saved = await transactionRequest<GameState | undefined>(
    "readonly",
    (store) => store.get(STATE_KEY),
  );
  if (!saved) {
    const empty = createEmptyState();
    await saveGame(empty);
    return empty;
  }
  return normalizeGame(saved);
};

export const saveGame = (state: GameState): Promise<void> =>
  transactionRequest<IDBValidKey>("readwrite", (store) =>
    store.put(state, STATE_KEY),
  ).then(() => undefined);

const domains: Domain[] = [
  "learning",
  "fitness",
  "creation",
  "discipline",
  "social",
  "exploration",
];

const isQuest = (value: unknown): value is Quest => {
  if (!value || typeof value !== "object") return false;
  const quest = value as Partial<Quest>;
  return (
    typeof quest.id === "string" &&
    typeof quest.title === "string" &&
    typeof quest.description === "string" &&
    domains.includes(quest.domain as Domain) &&
    typeof quest.plannedMinutes === "number" &&
    quest.plannedMinutes > 0 &&
    (quest.difficulty === "normal" || quest.difficulty === "challenge") &&
    typeof quest.isCustom === "boolean"
  );
};

export const validateBackup = (value: unknown): value is GameState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  if (
    state.version !== 1 ||
    !Array.isArray(state.quests) ||
    !state.quests.every(isQuest) ||
    !Array.isArray(state.sessions) ||
    !Array.isArray(state.memories) ||
    !state.settings ||
    typeof state.settings.sound !== "boolean" ||
    typeof state.settings.haptics !== "boolean" ||
    typeof state.settings.reducedMotion !== "boolean"
  ) {
    return false;
  }
  if (state.profile !== null) {
    if (
      !state.profile ||
      typeof state.profile.nickname !== "string" ||
      typeof state.profile.mainGoal !== "string" ||
      typeof state.profile.createdAt !== "string" ||
      !state.profile.attributes
    ) {
      return false;
    }
  }
  return state.sessions.every(
    (session) =>
      session &&
      typeof session.id === "string" &&
      typeof session.questId === "string" &&
      ["active", "abandoned", "completed"].includes(session.status) &&
      typeof session.startedAt === "string" &&
      typeof session.plannedMinutes === "number",
  );
};

export const importBackup = async (value: unknown): Promise<GameState> => {
  if (!validateBackup(value)) {
    throw new Error("备份格式无效");
  }
  const normalized = normalizeGame(value);
  await saveGame(normalized);
  return normalized;
};

export const clearGame = async (): Promise<GameState> => {
  const empty = createEmptyState();
  await saveGame(empty);
  return empty;
};
