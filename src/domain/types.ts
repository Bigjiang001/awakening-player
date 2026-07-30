export type Domain =
  | "learning"
  | "fitness"
  | "creation"
  | "discipline"
  | "social"
  | "exploration";

export type AttributeKey =
  | "intelligence"
  | "strength"
  | "creativity"
  | "willpower"
  | "charisma"
  | "perception";

export type QuestTag =
  | "popular"
  | "fat-loss"
  | "english"
  | "courage"
  | "upgrade"
  | "creative"
  | "seasonal";

export type PlayerProfile = {
  id: string;
  nickname: string;
  mainGoal: string;
  createdAt: string;
  attributes: Record<AttributeKey, number>;
  totalCompletions: number;
  totalActionSeconds: number;
  actionPoints: number;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  domain: Domain;
  plannedMinutes: number;
  difficulty: "normal" | "challenge";
  isCustom: boolean;
  tags?: QuestTag[];
  communitySourceId?: string;
};

export type CommunityQuest = {
  id: string;
  title: string;
  description: string;
  domain: Domain;
  plannedMinutes: number;
  difficulty: "normal" | "challenge";
  authorNickname: string;
  authorStage: string;
  adoptedCount: number;
  completedCount: number;
  createdAt: string;
};

export type TaskSession = {
  id: string;
  questId: string;
  status: "active" | "abandoned" | "completed";
  startedAt: string;
  completedAt?: string;
  plannedMinutes: number;
  timingMode?: "timed" | "result";
  finalDurationSeconds?: number;
  firstStep?: string;
};

export type GrowthMemory = {
  id: string;
  questId: string;
  questTitle: string;
  domain: Domain;
  completedAt: string;
  durationSeconds: number;
  note?: string;
  photoDataUrl?: string;
};

export type GrowthNode = {
  id: string;
  domain: Domain;
  title: string;
  description: string;
  requirementType:
    | "completionCount"
    | "totalMinutes"
    | "challengeCount"
    | "manualRecord";
  requirementValue: number;
};

export type PlayerSettings = {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
};

export type DailyAwakeningPlan = {
  date: string;
  questIds: [string, string, string];
  createdAt: string;
  claimedAt?: string;
};

export type RealReward = {
  id: string;
  name: string;
  description: string;
  mark: string;
  pointCost: number;
  weeklyLimit: number;
  isCustom: boolean;
  createdAt: string;
};

export type RewardRedemption = {
  id: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  redeemedAt: string;
};

export type GrowthExpedition = {
  id: string;
  domain: Domain;
  targetCount: 3 | 5 | 7;
  baselineCount: number;
  startedAt: string;
  plannedEndAt: string;
  claimedAt?: string;
};

export type CourageLadder = {
  id: string;
  themeId: string;
  title: string;
  domain: Domain;
  stepQuestIds: [string, string, string, string];
  startedAt: string;
  claimedAt?: string;
};

export type CampaignKind =
  | "fitness"
  | "english"
  | "career"
  | "creation"
  | "rhythm"
  | "custom";

export type LifeCampaign = {
  id: string;
  kind: CampaignKind;
  title: string;
  domain: Domain;
  targetCount: number;
  baselineCount: number;
  bossQuestId: string;
  startedAt: string;
  claimedAt?: string;
};

export type ActionContext = {
  minutes: 5 | 15 | 30 | 60;
  energy: "low" | "steady" | "high";
  place: "home" | "work" | "outdoor" | "commute";
  updatedAt: string;
};

export type ProductMetrics = {
  launches: number;
  recommendationStarts: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
};

export type WeeklyReview = {
  id: string;
  weekStart: string;
  completedAt: string;
  completedQuestCount: number;
  activeDayCount: number;
  actionSeconds: number;
  recoveryActionCount: number;
  strongestDomain: Domain;
  growthDomain: Domain;
  proudMoment: string;
  lesson: string;
  nextStep: string;
};

export type RecoverySession = {
  id: string;
  actionId: string;
  status: "active" | "abandoned" | "completed";
  startedAt: string;
  completedAt?: string;
  finalDurationSeconds?: number;
};

export type GameState = {
  version: 1;
  profile: PlayerProfile | null;
  quests: Quest[];
  sessions: TaskSession[];
  memories: GrowthMemory[];
  activeSessionId: string | null;
  launchPlans: Record<string, string>;
  launchMinutes: Record<string, number>;
  dailyPlans: DailyAwakeningPlan[];
  weeklyReviews: WeeklyReview[];
  recoverySessions: RecoverySession[];
  activeRecoveryId: string | null;
  realRewards: RealReward[];
  rewardRedemptions: RewardRedemption[];
  rewardedSessionIds: string[];
  expeditions: GrowthExpedition[];
  courageLadders: CourageLadder[];
  campaigns: LifeCampaign[];
  actionContext: ActionContext;
  metrics: ProductMetrics;
  lastModifiedAt: string;
  settings: PlayerSettings;
};

export type GrowthStage = {
  name: string;
  eyebrow: string;
  description: string;
  nextHint: string;
};
