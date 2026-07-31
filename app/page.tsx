"use client";

import {
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DOMAIN_META,
  DOMAIN_ORDER,
  EQUIPMENT_CARDS,
  RECOVERY_ACTIONS,
  REST_DAY_QUEST_IDS,
} from "../src/data/game-data";
import { CommunityQuestHub } from "../src/components/community-quest-hub";
import {
  actionStreaks,
  activeCourageLadder,
  achievementsFor,
  buildDailyPlan,
  canCompleteSession,
  canCompleteRecovery,
  completedRestartToday,
  completionExperienceReward,
  completionPointReward,
  contextualQuest,
  courageLadderProgress,
  createId,
  dailyPlanFor,
  dailyPlanItems,
  dailyEncounterFor,
  domainStats,
  equipmentCollection,
  elapsedSeconds,
  formatDuration,
  formatMinutes,
  getQuest,
  hasReachedSessionReference,
  isRestDay,
  isBossQuest,
  isCourageQuest,
  isRestartQuest,
  localDateKey,
  levelProgress,
  masteryPointBonus,
  questCompletionCount,
  questMastery,
  questUnlockLevel,
  questUsesReferenceTime,
  recoveryElapsedSeconds,
  recoveryReadiness,
  reconcileProgress,
  safetyGuidance,
  suggestedFirstStep,
  suggestedRestartQuest,
  weekKey,
  weeklyBossFor,
  weeklyBossProgress,
  worldStateFor,
} from "../src/domain/rules";
import type {
  CommunityQuest,
  CourageLadder,
  Domain,
  EquipmentCard,
  GameState,
  GrowthMemory,
  Quest,
  QuestTag,
  RealReward,
} from "../src/domain/types";
import {
  clearGame,
  createEmptyState,
  importBackup,
  loadGame,
  saveGame,
} from "../src/storage/db";
import { compressImage } from "../src/storage/image";
import { loadCloudGame, saveCloudGame } from "../src/storage/cloud";

type Tab = "home" | "quests" | "focus" | "growth" | "profile";
type QuestFilter = "all" | Domain;
type QuestPackFilter = "all" | QuestTag;
type CompletionRewardOutcome = {
  questTitle: string;
  domain: Domain;
  points: number;
  experience: number;
  level: number;
  levelUp: boolean;
  bonusLabels: string[];
  masteryTitle?: string;
  achievements: string[];
  equipmentUnlocks: EquipmentCard[];
  bossDefeated?: string;
  totalPoints: number;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const isLocalOnlyHosting = () =>
  typeof document !== "undefined" &&
  document.documentElement.dataset.hostMode === "local";

type CourageTheme = {
  id: string;
  title: string;
  description: string;
  domain: Domain;
  steps: [
    { title: string; description: string; minutes: number },
    { title: string; description: string; minutes: number },
    { title: string; description: string; minutes: number },
    { title: string; description: string; minutes: number },
  ];
};

const GOALS = [
  "建立稳定的生活节奏",
  "持续学习与进步",
  "让身体更有力量",
  "完成属于自己的作品",
  "探索下一种人生可能",
];

const COURAGE_THEMES: CourageTheme[] = [
  {
    id: "speak",
    title: "主动表达",
    description: "从准备一句话，到在真实场景中说出自己的想法。",
    domain: "social",
    steps: [
      { title: "写下真正想说的话", description: "选一个安全话题，写出一段诚实但尊重的表达。", minutes: 10 },
      { title: "向熟悉的人表达一次", description: "向信任的人说出一个真实想法，不追求完美回应。", minutes: 10 },
      { title: "在真实场景主动发言", description: "在工作、课堂或交流中，主动说出观点或提出问题。", minutes: 15 },
      { title: "复盘一次主动表达", description: "记录发生了什么、害怕什么，以及下次要保留的一点。", minutes: 10 },
    ],
  },
  {
    id: "ask-help",
    title: "主动求助",
    description: "练习承认不知道，并向现实中的人提出清楚请求。",
    domain: "social",
    steps: [
      { title: "列出一个真实卡点", description: "写清楚自己试过什么，以及究竟需要哪一种帮助。", minutes: 10 },
      { title: "提出一个低压力问题", description: "向合适的人询问一个具体、容易回答的小问题。", minutes: 10 },
      { title: "发出一次完整求助", description: "说明背景、已做尝试和希望对方提供的具体帮助。", minutes: 15 },
      { title: "整理获得的帮助", description: "记录有效信息，并向帮助你的人表达感谢。", minutes: 10 },
    ],
  },
  {
    id: "boundaries",
    title: "表达边界",
    description: "温和而清楚地表达自己的时间、精力和底线。",
    domain: "discipline",
    steps: [
      { title: "辨认一条需要的边界", description: "写下让你持续消耗的情境，以及你真正能承受的范围。", minutes: 10 },
      { title: "练习一句边界表达", description: "把拒绝写成简短、尊重、不需要过度解释的一句话。", minutes: 10 },
      { title: "在真实关系中表达边界", description: "选择相对安全的场景，说出一次明确的接受范围或拒绝。", minutes: 15 },
      { title: "观察边界后的感受", description: "记录结果、身体感受和下次可以调整的表达。", minutes: 10 },
    ],
  },
  {
    id: "show-work",
    title: "公开作品",
    description: "停止等待完美，让真实作品接受一次现实反馈。",
    domain: "creation",
    steps: [
      { title: "选出一份可展示作品", description: "选择一份不完美但已经能说明想法的作品。", minutes: 10 },
      { title: "发给一位可信的人", description: "把作品发给一位可信的人，并提出一个具体反馈问题。", minutes: 10 },
      { title: "公开发布一次作品", description: "在合适的平台或真实场景展示作品，不用等到完美。", minutes: 15 },
      { title: "吸收一条有效反馈", description: "区分事实与情绪，选择一条有效反馈完成小改进。", minutes: 15 },
    ],
  },
  {
    id: "connection",
    title: "建立连接",
    description: "从一句问候开始，创造一段真实而有边界的人际连接。",
    domain: "social",
    steps: [
      { title: "选定一个想联系的人", description: "选一个合适对象，写下联系原因与自然开场。", minutes: 10 },
      { title: "发出一次真诚问候", description: "发送一条具体、真诚、不索取立即回应的消息。", minutes: 10 },
      { title: "完成一次真实交流", description: "进行一次专注的线上或线下交流，认真听对方说话。", minutes: 15 },
      { title: "记录连接中的发现", description: "写下你对对方和自己的一个新认识。", minutes: 10 },
    ],
  },
  {
    id: "hard-start",
    title: "启动困难的事",
    description: "把一直逃避的事情拆开，完成第一轮真实推进。",
    domain: "discipline",
    steps: [
      { title: "定义最小可见结果", description: "把模糊压力写成今天能完成、能看见的一个结果。", minutes: 10 },
      { title: "完成一次试启动", description: "移开干扰，只推进最容易开始的一小段。", minutes: 5 },
      { title: "完成一次完整推进", description: "围绕最小结果专注行动，让事情产生真实变化。", minutes: 20 },
      { title: "留下下一步入口", description: "整理现场并写下一步，让下次启动更容易。", minutes: 10 },
    ],
  },
];

const NAV_ITEMS: Array<{ id: Tab; label: string; mark: string }> = [
  { id: "home", label: "今朝", mark: "始" },
  { id: "quests", label: "任务", mark: "令" },
  { id: "focus", label: "专注", mark: "行" },
  { id: "growth", label: "成长", mark: "星" },
  { id: "profile", label: "我的", mark: "我" },
];

const TASK_PACKS: Array<{
  id: QuestTag;
  label: string;
  mark: string;
  description: string;
}> = [
  { id: "popular", label: "热门", mark: "燃", description: "大家正在真实行动" },
  { id: "fat-loss", label: "轻盈减脂", mark: "轻", description: "不挨饿，不惩罚身体" },
  { id: "english", label: "英语开口", mark: "说", description: "从会看走向敢说" },
  { id: "courage", label: "勇气破界", mark: "勇", description: "想做却不敢做的事" },
  { id: "upgrade", label: "自我升级", mark: "升", description: "让能力真正值钱" },
  { id: "creative", label: "创意生活", mark: "趣", description: "给日常增加新剧情" },
  { id: "seasonal", label: "本季特别", mark: "夏", description: "只属于这个季节的行动" },
];

const QUEST_TAG_LABELS: Record<QuestTag, string> = {
  popular: "热门",
  "fat-loss": "减脂",
  english: "英语",
  courage: "勇气",
  upgrade: "提升",
  creative: "有趣",
  seasonal: "本季",
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date));

function AppLogo({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand-mark ${small ? "brand-mark--small" : ""}`} aria-hidden>
      <span className="brand-mark__ring" />
      <span className="brand-mark__core">觉</span>
    </div>
  );
}

function DomainMark({ domain, compact = false }: { domain: Domain; compact?: boolean }) {
  return (
    <span className={`domain-mark domain-${domain} ${compact ? "domain-mark--compact" : ""}`}>
      {DOMAIN_META[domain].mark}
    </span>
  );
}

function EquipmentArtwork({
  equipment,
  locked = false,
}: {
  equipment: EquipmentCard;
  locked?: boolean;
}) {
  return (
    <div
      className={`equipment-art equipment-art--${equipment.artIndex} ${locked ? "is-locked" : ""}`}
      role="img"
      aria-label={locked ? "尚未解锁的装备" : equipment.name}
    />
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <AppLogo />
      <p>正在唤醒你的世界</p>
    </main>
  );
}

function Onboarding({
  onCreate,
}: {
  onCreate: (mainGoal: string) => void;
}) {
  const [goal, setGoal] = useState(GOALS[0]);
  const [step, setStep] = useState<"goal" | "declaration">("goal");

  return (
    <main className="onboarding">
      <div className="onboarding__aurora" aria-hidden />
      <section className="onboarding__intro">
        <AppLogo />
        <div>
          <p className="eyebrow">现实人生游戏化</p>
          <h1>觉醒玩家</h1>
        </div>
        <p className="onboarding__quote">选择一条现实主线，然后立刻开始。</p>
      </section>

      {step === "goal" ? (
        <section className="onboarding__form">
          <div className="step-label"><span>01</span>选择你最想推进的人生主线</div>
          <div className="goal-grid" role="radiogroup" aria-label="初始成长目标">
            {GOALS.map((item) => (
              <button
                className={`goal-option ${goal === item ? "is-selected" : ""}`}
                key={item}
                type="button"
                role="radio"
                aria-checked={goal === item}
                onClick={() => setGoal(item)}
              >
                <span>{item}</span>
                <i aria-hidden>{goal === item ? "●" : "○"}</i>
              </button>
            ))}
          </div>
          <button className="primary-button primary-button--large" type="button" onClick={() => setStep("declaration")}>
            确认我的主线<span aria-hidden>→</span>
          </button>
        </section>
      ) : (
        <section className="awakening-declaration">
          <span aria-hidden>醒</span>
          <p>欢迎来到觉醒玩家。</p>
          <h2>从今天开始，把现实，当作你真正的人生 RPG。</h2>
          <button className="primary-button primary-button--large" type="button" onClick={() => onCreate(goal)}>
            开始现实行动<span aria-hidden>→</span>
          </button>
          <button className="plain-button" type="button" onClick={() => setStep("goal")}>重新选择</button>
          <p className="privacy-note">成长记录只属于你</p>
        </section>
      )}
    </main>
  );
}

function ScreenHeader({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow: string;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <header className="screen-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {trailing}
    </header>
  );
}

function QuestCard({
  quest,
  onStart,
  state,
  featured = false,
}: {
  quest: Quest;
  onStart: (quest: Quest) => void;
  state: GameState;
  featured?: boolean;
}) {
  const meta = DOMAIN_META[quest.domain];
  const mastery = questMastery(state, quest.id);
  const unlockLevel = questUnlockLevel(quest);
  const locked = (state.profile?.level ?? 1) < unlockLevel;
  const usesReferenceTime = questUsesReferenceTime(quest);
  const displayMinutes = isRestartQuest(quest)
    ? quest.plannedMinutes
    : state.launchMinutes[quest.id] ?? quest.plannedMinutes;
  return (
    <article className={`quest-card ${featured ? "quest-card--featured" : ""} ${locked ? "is-locked" : ""}`}>
      <div className="quest-card__top">
        <DomainMark domain={quest.domain} />
        <div className="quest-card__copy">
          <div className="quest-card__meta">
            <span>{meta.name} · {meta.attribute}</span>
            {mastery.count > 0 && <em>{mastery.rank.title} · {mastery.count} 次</em>}
            {quest.difficulty === "challenge" && <b>挑战</b>}
            {quest.isCustom && <b>自定</b>}
          </div>
          {quest.tags && quest.tags.length > 0 && (
            <div className="quest-card__tags">
              {quest.tags.slice(0, 3).map((tag) => (
                <span key={tag}>{QUEST_TAG_LABELS[tag]}</span>
              ))}
            </div>
          )}
          <h3>{quest.title}</h3>
          <p>{quest.description}</p>
        </div>
      </div>
      <div className="quest-card__bottom">
        <span className="time-chip">
          <i aria-hidden>{usesReferenceTime ? "◷" : "✓"}</i>
          {locked
            ? `LV.${unlockLevel} 解锁`
            : usesReferenceTime
              ? `${displayMinutes} 分钟参考`
              : "按结果完成"}
        </span>
        <button type="button" disabled={locked} onClick={() => onStart(quest)}>
          {locked ? "尚未解锁" : "开始行动"}
          <span aria-hidden>→</span>
        </button>
      </div>
    </article>
  );
}

function HomeScreen({
  state,
  activeQuest,
  activeElapsed,
  currentTime,
  activeRecoveryTitle,
  activeRecoveryElapsed,
  onNavigate,
  onStart,
  onOpenRecovery,
}: {
  state: GameState;
  activeQuest?: Quest;
  activeElapsed: number;
  currentTime: number;
  activeRecoveryTitle?: string;
  activeRecoveryElapsed: number;
  onNavigate: (tab: Tab) => void;
  onStart: (quest: Quest) => void;
  onOpenRecovery: () => void;
}) {
  const [showRemedy, setShowRemedy] = useState(false);
  const profile = state.profile!;
  const levelState = levelProgress(profile.experience);
  const timeline = currentTime || new Date(state.lastModifiedAt).getTime();
  const dailyPlan = dailyPlanFor(state);
  const dailyItems = dailyPlan ? dailyPlanItems(state, dailyPlan) : [];
  const mainQuest = dailyItems[0]?.quest ?? contextualQuest(state);
  const mainCompleted = dailyItems[0]?.completed ?? false;
  const sideItems = dailyItems.slice(1);
  const restDay = isRestDay(timeline);
  const restQuests = REST_DAY_QUEST_IDS.flatMap((id) => {
    const quest = getQuest(state, id);
    return quest ? [quest] : [];
  });
  const encounter = dailyEncounterFor(state, timeline);
  const boss = weeklyBossFor(state, timeline);
  const bossProgress = weeklyBossProgress(state, boss, timeline);
  const bossDefeated = state.bossVictories.some(
    (victory) =>
      victory.bossId === boss.id &&
      victory.week === weekKey(timeline),
  );
  const remedyQuest = suggestedRestartQuest(state);
  const remedyDone = completedRestartToday(state);
  const completedToday = (questId: string) =>
    state.sessions.some(
      (session) =>
        session.questId === questId &&
        session.status === "completed" &&
        session.completedAt &&
        localDateKey(session.completedAt) === localDateKey(),
    );
  const timingLabel = (quest: Quest) =>
    questUsesReferenceTime(quest)
      ? `${state.launchMinutes[quest.id] ?? quest.plannedMinutes} 分钟参考`
      : "按现实结果完成";

  return (
    <div className="screen home-screen home-screen--v002">
      <ScreenHeader
        eyebrow={formatDate(new Date().toISOString())}
        title="今天，去现实里升级"
        trailing={<AppLogo small />}
      />

      <section className="player-level-strip">
        <span>LV.{profile.level}</span>
        <div>
          <p>玩家等级</p>
          <div aria-label={`等级经验 ${levelState.current} / ${levelState.required}`}>
            <i style={{ width: `${levelState.ratio * 100}%` }} />
          </div>
        </div>
        <strong>{levelState.current} / 100 EXP</strong>
      </section>

      {activeQuest || activeRecoveryTitle ? (
        <section className="active-banner" onClick={() => onNavigate("focus")}>
          <div className="active-pulse" aria-hidden />
          <div>
            <p>{activeQuest ? "现实行动正在发生" : "恢复正在发生"}</p>
            <h3>{activeQuest?.title ?? activeRecoveryTitle}</h3>
          </div>
          <strong>{formatDuration(activeQuest ? activeElapsed : activeRecoveryElapsed)}</strong>
          <button type="button" aria-label="回到当前行动">→</button>
        </section>
      ) : null}

      {restDay ? (
        <section className="rest-day-card">
          <span className="rest-day-card__mark" aria-hidden>息</span>
          <div>
            <p>本周休息日</p>
            <h2>今天没有主线任务</h2>
            <span>恢复也是成长的一部分。只做让身体和生活重新舒展的轻任务。</span>
          </div>
          <button type="button" onClick={onOpenRecovery}>进入恢复营地</button>
        </section>
      ) : (
        <section className={`daily-main-quest ${mainCompleted ? "is-complete" : ""}`}>
          <div className="daily-mission-heading">
            <span>今日主线</span>
            <small>{mainCompleted ? "已完成" : "+30 EXP（含主线奖励）"}</small>
          </div>
          <div className="daily-main-quest__body">
            <DomainMark domain={mainQuest.domain} />
            <div>
              <h2>{mainQuest.title}</h2>
              <p>{mainQuest.description}</p>
              <span>{timingLabel(mainQuest)}</span>
            </div>
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={mainCompleted}
            onClick={() => onStart(mainQuest)}
          >
            {mainCompleted ? "主线已完成" : "开始今日主线"}
            {!mainCompleted && <span aria-hidden>→</span>}
          </button>
          {!mainCompleted && !showRemedy && (
            <button className="daily-remedy-trigger" type="button" onClick={() => setShowRemedy(true)}>
              今天确实做不了？开启补救任务
            </button>
          )}
        </section>
      )}

      {!restDay && showRemedy && (
        <section className={`remedy-card ${remedyDone ? "is-complete" : ""}`}>
          <span aria-hidden>{remedyDone ? "✓" : "救"}</span>
          <div>
            <small>补救任务 · 不让今天彻底中断</small>
            <h3>{remedyQuest.title}</h3>
            <p>{remedyQuest.description}</p>
          </div>
          <button type="button" disabled={remedyDone} onClick={() => onStart(remedyQuest)}>
            {remedyDone ? "已补救" : "开始 5 分钟"}
          </button>
        </section>
      )}

      <section className="daily-side-quests">
        <div className="section-heading section-heading--compact">
          <div>
            <p>{restDay ? "轻松任务" : "今日支线"}</p>
            <h2>{restDay ? "只做让你恢复的事" : "可选，但会让今天更完整"}</h2>
          </div>
          <button type="button" onClick={() => onNavigate("quests")}>全部任务</button>
        </div>
        <div className="daily-side-list">
          {(restDay
            ? restQuests.map((quest) => ({ quest, completed: completedToday(quest.id) }))
            : sideItems
          ).map(({ quest, completed }) => (
            <button
              className={completed ? "is-complete" : ""}
              type="button"
              key={quest.id}
              disabled={completed}
              onClick={() => onStart(quest)}
            >
              <DomainMark domain={quest.domain} compact />
              <div>
                <strong>{quest.title}</strong>
                <small>{timingLabel(quest)}</small>
              </div>
              <span>{completed ? "✓" : "+20 EXP"}</span>
            </button>
          ))}
        </div>
      </section>

      {encounter && (
        <section className={`daily-encounter ${encounter.completed ? "is-complete" : ""}`}>
          <div className="daily-encounter__symbol" aria-hidden>?</div>
          <div>
            <p>今日奇遇</p>
            <h2>{encounter.quest.title}</h2>
            <span>{encounter.intro}</span>
          </div>
          <button
            type="button"
            disabled={encounter.completed}
            onClick={() => onStart(encounter.quest)}
          >
            {encounter.completed ? "奇遇完成" : "接受奇遇"}
          </button>
        </section>
      )}

      <section className={`weekly-boss-card ${bossDefeated ? "is-defeated" : ""}`}>
        <div className="weekly-boss-card__head">
          <div>
            <p>本周现实 Boss</p>
            <h2>{boss.title}</h2>
            <span>{boss.subtitle}</span>
          </div>
          <strong aria-hidden>{bossDefeated ? "胜" : boss.mark}</strong>
        </div>
        <p className="weekly-boss-card__description">
          {bossDefeated ? "你已经用现实行动击败了它。本周不需要重复证明。" : boss.description}
        </p>
        <div className="weekly-boss-progress" aria-label={`Boss 进度 ${bossProgress} / ${boss.targetCount}`}>
          {Array.from({ length: boss.targetCount }, (_, index) => (
            <i className={index < bossProgress ? "is-complete" : ""} key={index}>
              {index < bossProgress ? "✓" : index + 1}
            </i>
          ))}
        </div>
        <div className="weekly-boss-card__footer">
          <span>{bossDefeated ? "已获得 Boss 称号" : `${bossProgress} / ${boss.targetCount} · 击败奖励 50 EXP`}</span>
          {!bossDefeated && <button type="button" onClick={() => onNavigate("quests")}>寻找克制任务</button>}
        </div>
      </section>

      <p className="home-reality-reminder">关闭应用，去现实里完成它。成长会在你回来时等待结算。</p>
    </div>
  );
}
function QuestScreen({
  state,
  onStart,
  onCreate,
  onPublish,
  onAdopt,
  onCreateCourageLadder,
  onClaimCourageLadder,
  localOnly,
}: {
  state: GameState;
  onStart: (quest: Quest) => void;
  onCreate: (quest: Quest) => void;
  onPublish: (quest: Quest) => Promise<boolean>;
  onAdopt: (quest: CommunityQuest) => void;
  onCreateCourageLadder: (theme: CourageTheme) => void;
  onClaimCourageLadder: (ladder: CourageLadder) => void;
  localOnly: boolean;
}) {
  const [filter, setFilter] = useState<QuestFilter>("all");
  const [packFilter, setPackFilter] = useState<QuestPackFilter>("all");
  const [view, setView] = useState<"mine" | "community">("mine");
  const [showCreator, setShowCreator] = useState(false);
  const [showCourageCreator, setShowCourageCreator] = useState(false);
  const [selectedCourageTheme, setSelectedCourageTheme] = useState(
    COURAGE_THEMES[0].id,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<Domain>("learning");
  const [minutesInput, setMinutesInput] = useState("15");
  const [challenge, setChallenge] = useState(false);
  const [shareCommunity, setShareCommunity] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [communityRefreshKey, setCommunityRefreshKey] = useState(0);
  const [communityNotice, setCommunityNotice] = useState("");
  const courageLadder = activeCourageLadder(state);
  const courageProgress = courageLadder
    ? courageLadderProgress(state, courageLadder.stepQuestIds)
    : 0;
  const courageStepQuest = courageLadder
    ? courageLadder.stepQuestIds
        .map((id) => getQuest(state, id))
        .find(
          (quest) => quest && questCompletionCount(state, quest.id) === 0,
        )
    : undefined;

  const quests = state.quests
    .filter(
      (quest) =>
        !isRestartQuest(quest) &&
        !isCourageQuest(quest) &&
        !isBossQuest(quest) &&
        (filter === "all" || quest.domain === filter) &&
        (packFilter === "all" || quest.tags?.includes(packFilter)),
    )
    .sort(
      (left, right) =>
        Number(Boolean(right.tags?.includes("popular"))) -
        Number(Boolean(left.tags?.includes("popular"))),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const usesReferenceTime = questUsesReferenceTime({
      id: "custom-preview",
      domain,
    });
    const parsedMinutes = Number(minutesInput);
    if (
      !title.trim() ||
      (usesReferenceTime &&
        (!Number.isFinite(parsedMinutes) ||
          parsedMinutes < 1 ||
          parsedMinutes > 480))
    ) {
      return;
    }
    const createdQuest: Quest = {
      id: createId("quest"),
      title: title.trim(),
      description: description.trim() || "由你定义的现实行动。",
      domain,
      plannedMinutes: usesReferenceTime ? parsedMinutes : 15,
      difficulty: challenge ? "challenge" : "normal",
      isCustom: true,
    };
    onCreate(createdQuest);
    if (shareCommunity && !localOnly) {
      setPublishing(true);
      const published = await onPublish(createdQuest);
      setPublishing(false);
      setCommunityNotice(
        published
          ? "已发布到同行广场，其他玩家可以加入这项任务。"
          : "任务已保存到本机，但暂时未能发布到广场。",
      );
      if (published) setCommunityRefreshKey((current) => current + 1);
    }
    setTitle("");
    setDescription("");
    setMinutesInput("15");
    setChallenge(false);
    setShareCommunity(false);
    setShowCreator(false);
    setFilter(domain);
    setPackFilter("all");
  };

  const viewSwitch = localOnly ? (
    <div className="local-mode-notice" role="status">
      <span aria-hidden>机</span>
      <div>
        <strong>手机本地存档版</strong>
        <small>任务和成长保存在当前设备；同行广场将在连接独立后端后恢复。</small>
      </div>
    </div>
  ) : (
    <div className="quest-view-switch" aria-label="任务来源">
      <button className={view === "mine" ? "is-active" : ""} type="button" onClick={() => setView("mine")}>
        我的任务
      </button>
      <button className={view === "community" ? "is-active" : ""} type="button" onClick={() => setView("community")}>
        同行广场
      </button>
    </div>
  );

  if (!localOnly && view === "community") {
    return (
      <div className="screen quest-screen">
        <ScreenHeader eyebrow="共同目标 · 彼此照亮" title="同行任务广场" />
        {viewSwitch}
        {communityNotice && <p className="community-notice" role="status">{communityNotice}</p>}
        <CommunityQuestHub state={state} refreshKey={communityRefreshKey} onAdopt={onAdopt} />
      </div>
    );
  }

  return (
    <div className="screen quest-screen">
      <ScreenHeader
        eyebrow={`${quests.length} 个可行动任务`}
        title="选择一次行动"
        trailing={
          <button className="round-action" type="button" onClick={() => setShowCreator(true)} aria-label="创建自定义任务">
            ＋
          </button>
        }
      />
      <p className="screen-lead">选择一件在现实里真正发生的事。完成后，对应能力将增加 1 点。</p>
      {viewSwitch}
      {communityNotice && <p className="community-notice" role="status">{communityNotice}</p>}

      <section className={`courage-card ${courageProgress === 4 ? "is-ready" : ""}`}>
        <div className="courage-card__heading">
          <span aria-hidden>勇</span>
          <div>
            <p>勇气阶梯 · 四步训练</p>
            <h2>{courageLadder?.title ?? "把害怕的事，拆成能走的台阶"}</h2>
          </div>
        </div>
        {courageLadder ? (
          <>
            <div className="courage-steps">
              {courageLadder.stepQuestIds.map((questId, index) => {
                const quest = getQuest(state, questId);
                const complete = questCompletionCount(state, questId) > 0;
                const current = !complete && index === courageProgress;
                return (
                  <div className={`${complete ? "is-complete" : ""} ${current ? "is-current" : ""}`} key={questId}>
                    <span>{complete ? "✓" : index + 1}</span>
                    <small>{quest?.title ?? `第 ${index + 1} 步`}</small>
                  </div>
                );
              })}
            </div>
            <p className="gentle-rule">每一步都要独立完成现实行动；不设连胜，不因停顿扣分。</p>
            {courageProgress === 4 ? (
              <button className="courage-primary" type="button" onClick={() => onClaimCourageLadder(courageLadder)}>
                完成阶梯 · 领取 +12 行动点
              </button>
            ) : courageStepQuest ? (
              <button className="courage-primary" type="button" onClick={() => onStart(courageStepQuest)}>
                开始第 {courageProgress + 1} 步 · {courageStepQuest.title}
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="courage-card__copy">一次只跨一点舒适区：准备、小尝试、真实场景、复盘。</p>
            <button className="courage-primary" type="button" onClick={() => setShowCourageCreator(true)}>
              选择一条勇气阶梯
            </button>
          </>
        )}
      </section>

      <div className="task-pack-heading">
        <div>
          <p>任务主题</p>
          <h2>今天想升级哪一种自己？</h2>
        </div>
        {packFilter !== "all" && (
          <button type="button" onClick={() => setPackFilter("all")}>清除</button>
        )}
      </div>
      <div className="task-pack-rail" aria-label="按热门主题筛选">
        {TASK_PACKS.map((pack) => (
          <button
            className={packFilter === pack.id ? "is-active" : ""}
            type="button"
            key={pack.id}
            onClick={() => setPackFilter(packFilter === pack.id ? "all" : pack.id)}
          >
            <span aria-hidden>{pack.mark}</span>
            <strong>{pack.label}</strong>
            <small>{pack.description}</small>
          </button>
        ))}
      </div>

      <div className="quest-filter-heading">
        <span>能力领域</span>
        <small>{packFilter === "all" ? "全部主题" : TASK_PACKS.find((pack) => pack.id === packFilter)?.label} · {quests.length} 项</small>
      </div>
      <div className="filter-row" aria-label="按领域筛选">
        <button className={filter === "all" ? "is-active" : ""} type="button" onClick={() => setFilter("all")}>
          全部
        </button>
        {DOMAIN_ORDER.map((item) => (
          <button
            className={filter === item ? `is-active domain-${item}` : ""}
            key={item}
            type="button"
            onClick={() => setFilter(item)}
          >
            {DOMAIN_META[item].name}
          </button>
        ))}
      </div>

      <div className="quest-list">
        {quests.map((quest) => (
          <QuestCard quest={quest} state={state} key={quest.id} onStart={onStart} />
        ))}
        {quests.length === 0 && (
          <section className="quest-empty">
            <span aria-hidden>寻</span>
            <h3>这个组合还没有任务</h3>
            <p>换一个能力领域，或清除主题筛选。</p>
            <button type="button" onClick={() => {
              setFilter("all");
              setPackFilter("all");
            }}>查看全部任务</button>
          </section>
        )}
      </div>

      {showCreator && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setShowCreator(false)}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="create-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div>
                <p>自定义现实行动</p>
                <h2 id="create-title">创建任务</h2>
              </div>
              <button type="button" onClick={() => setShowCreator(false)} aria-label="关闭">×</button>
            </div>
            <form className="creator-form" onSubmit={submit}>
              <label className="field">
                <span>任务名称</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={30} placeholder="例如：整理作品集" autoFocus />
              </label>
              <label className="field">
                <span>现实目标</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={100} placeholder="完成到什么程度？" rows={3} />
              </label>
              <div className={questUsesReferenceTime({ id: "custom-preview", domain }) ? "form-split" : ""}>
                <label className="field">
                  <span>所属领域</span>
                  <select value={domain} onChange={(event) => setDomain(event.target.value as Domain)}>
                    {DOMAIN_ORDER.map((item) => (
                      <option value={item} key={item}>{DOMAIN_META[item].name} · {DOMAIN_META[item].attribute}</option>
                    ))}
                  </select>
                </label>
                {questUsesReferenceTime({ id: "custom-preview", domain }) && (
                  <label className="field">
                    <span>参考时长</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={480}
                      value={minutesInput}
                      onChange={(event) => setMinutesInput(event.target.value)}
                      placeholder="输入分钟"
                    />
                  </label>
                )}
              </div>
              <label className="switch-row">
                <span>
                  <strong>挑战任务</strong>
                  <small>需要你走出一点舒适区</small>
                </span>
                <input type="checkbox" checked={challenge} onChange={(event) => setChallenge(event.target.checked)} />
              </label>
              {!localOnly && (
                <label className="switch-row community-share-toggle">
                  <span>
                    <strong>公开到同行广场</strong>
                    <small>只公开昵称、成长阶段和任务内容；不会公开记录或照片</small>
                  </span>
                  <input type="checkbox" checked={shareCommunity} onChange={(event) => setShareCommunity(event.target.checked)} />
                </label>
              )}
              <button className="primary-button" type="submit" disabled={!title.trim() || publishing}>
                {publishing ? "正在发布…" : shareCommunity ? "创建并发布" : "创建并保存"}
              </button>
            </form>
          </section>
        </div>
      )}

      {showCourageCreator && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setShowCourageCreator(false)}>
          <section className="bottom-sheet courage-sheet" role="dialog" aria-modal="true" aria-labelledby="courage-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div>
                <p>一次只跨一个台阶</p>
                <h2 id="courage-title">选择勇气训练</h2>
              </div>
              <button type="button" onClick={() => setShowCourageCreator(false)} aria-label="关闭">×</button>
            </div>
            <div className="courage-theme-list">
              {COURAGE_THEMES.map((theme) => (
                <button
                  className={selectedCourageTheme === theme.id ? "is-active" : ""}
                  type="button"
                  key={theme.id}
                  onClick={() => setSelectedCourageTheme(theme.id)}
                >
                  <DomainMark domain={theme.domain} compact />
                  <div>
                    <strong>{theme.title}</strong>
                    <small>{theme.description}</small>
                  </div>
                  <span aria-hidden>{selectedCourageTheme === theme.id ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <p className="gentle-rule">请优先选择安全、合法、尊重他人边界的真实场景。危险不是勇气。</p>
            <button
              className="primary-button primary-button--large"
              type="button"
              onClick={() => {
                const theme = COURAGE_THEMES.find((item) => item.id === selectedCourageTheme);
                if (theme) onCreateCourageLadder(theme);
                setShowCourageCreator(false);
              }}
            >
              生成四步训练
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function QuestLaunchSheet({
  state,
  quest,
  onClose,
  onBegin,
}: {
  state: GameState;
  quest: Quest;
  onClose: () => void;
  onBegin: (
    quest: Quest,
    firstStep: string,
    minutes: number,
  ) => void;
}) {
  const restart = isRestartQuest(quest);
  const usesReferenceTime = questUsesReferenceTime(quest);
  const [firstStep, setFirstStep] = useState(
    state.launchPlans[quest.id] || suggestedFirstStep(quest),
  );
  const [minutesInput, setMinutesInput] = useState(
    String(
      restart
        ? quest.plannedMinutes
        : state.launchMinutes[quest.id] ?? quest.plannedMinutes,
    ),
  );
  const parsedMinutes = Number(minutesInput);
  const validMinutes =
    !usesReferenceTime ||
    restart ||
    (Number.isFinite(parsedMinutes) &&
      parsedMinutes >= 1 &&
      parsedMinutes <= 180);
  const mastery = questMastery(state, quest.id);
  const nextProgress = mastery.next
    ? Math.min(100, (mastery.count / mastery.next.minimum) * 100)
    : 100;

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bottom-sheet launch-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p>{DOMAIN_META[quest.domain].name} · {DOMAIN_META[quest.domain].attribute}</p>
            <h2 id="launch-title">{quest.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <section className="launch-objective">
          <span>现实目标</span>
          <p>{quest.description}</p>
        </section>

        <label className="field first-step-field">
          <span>现在就能动手的第一步</span>
          <textarea
            value={firstStep}
            onChange={(event) => setFirstStep(event.target.value)}
            maxLength={80}
            rows={2}
          />
          <small>第一步会带入专注页，但不会单独结算成长。</small>
        </label>

        {usesReferenceTime && (
          <div className="launch-duration">
            <div>
              <span>{restart ? "重新启动时间" : "本次参考时间"}</span>
              <small>
                {restart
                  ? "固定为 5 分钟，让低能量时也容易开始"
                  : "可以先完全清空再输入 1–180 分钟；参考时间不会锁住完成按钮"}
              </small>
            </div>
            {restart ? (
              <strong className="launch-duration__fixed">5 分钟</strong>
            ) : (
              <label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={180}
                  value={minutesInput}
                  onChange={(event) => setMinutesInput(event.target.value)}
                  placeholder="分钟"
                  aria-invalid={!validMinutes}
                />
                分钟
              </label>
            )}
          </div>
        )}

        {!restart && (
          <section className="mastery-strip">
            <span className="mastery-strip__rank">{mastery.rank.title}</span>
            <div>
              <p>现实熟练度 · 已正式完成 {mastery.count} 次</p>
              <div><i style={{ width: `${nextProgress}%` }} /></div>
              <small>
                {mastery.next
                  ? `再完成 ${mastery.next.minimum - mastery.count} 次，进入「${mastery.next.title}」`
                  : "长期践行，已经成为你生活的一部分"}
              </small>
            </div>
          </section>
        )}

        <p className="safety-guidance">{safetyGuidance(quest)}</p>
        <button
          className="primary-button primary-button--large"
          type="button"
          disabled={!firstStep.trim() || !validMinutes}
          onClick={() =>
            onBegin(
              quest,
              firstStep.trim(),
              usesReferenceTime ? (restart ? quest.plannedMinutes : parsedMinutes) : quest.plannedMinutes,
            )
          }
        >
          开始真实行动
          <span aria-hidden>→</span>
        </button>
      </section>
    </div>
  );
}

function RecoveryCamp({
  state,
  onClose,
  onStart,
}: {
  state: GameState;
  onClose: () => void;
  onStart: (actionId: string) => void;
}) {
  const readiness = recoveryReadiness(state);
  const completedToday = new Set(
    state.recoverySessions
      .filter(
        (session) =>
          session.status === "completed" &&
          session.completedAt &&
          localDateKey(session.completedAt) === localDateKey(),
      )
      .map((session) => session.actionId),
  );

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bottom-sheet recovery-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p>强者也需要恢复</p>
            <h2 id="recovery-title">恢复营地</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <section className="recovery-readiness">
          <strong>{readiness.score}</strong>
          <div>
            <span>{readiness.title}</span>
            <p>{readiness.guidance}</p>
            <small>今日行动 {formatMinutes(readiness.focusedToday)} · 恢复 {readiness.recoveryToday} 次</small>
          </div>
        </section>
        <div className="recovery-goal">
          <span>今日恢复节律</span>
          <div>{[0, 1, 2, 3].map((item) => <i className={item < completedToday.size ? "is-done" : ""} key={item} />)}</div>
          <strong>{Math.min(4, completedToday.size)} / 4</strong>
        </div>
        <div className="recovery-list">
          {RECOVERY_ACTIONS.map((action) => {
            const completed = completedToday.has(action.id);
            return (
              <button
                className={completed ? "is-complete" : ""}
                type="button"
                key={action.id}
                disabled={completed}
                onClick={() => onStart(action.id)}
              >
                <span>{completed ? "✓" : action.mark}</span>
                <div>
                  <strong>{action.title}</strong>
                  <p>{action.objective}</p>
                  <small>{action.detail}</small>
                </div>
                <i>{completed ? "已恢复" : `${action.minutes} 分钟 →`}</i>
              </button>
            );
          })}
        </div>
        <p className="gentle-rule">恢复不会增加六项属性，也不会因为少做或漏做受到惩罚。</p>
      </section>
    </div>
  );
}

function EmptyFocus({ onPick }: { onPick: () => void }) {
  return (
    <div className="screen focus-screen focus-screen--empty">
      <ScreenHeader eyebrow="正计时专注" title="让行动发生" />
      <div className="empty-focus__visual" aria-hidden>
        <div className="focus-orbit focus-orbit--outer" />
        <div className="focus-orbit focus-orbit--inner" />
        <span>行</span>
      </div>
      <h2>此刻没有进行中的任务</h2>
      <p>这里不催促你，也不会因为离开而清零。选择一件现实任务，计时会如实记录你的行动。</p>
      <button className="primary-button primary-button--large" type="button" onClick={onPick}>选择任务</button>
    </div>
  );
}

function RecoveryFocusScreen({
  state,
  elapsed,
  onAbandon,
  onComplete,
}: {
  state: GameState;
  elapsed: number;
  onAbandon: () => void;
  onComplete: () => void;
}) {
  const session = state.recoverySessions.find(
    (item) => item.id === state.activeRecoveryId,
  );
  const action = RECOVERY_ACTIONS.find((item) => item.id === session?.actionId);
  if (!session || !action) return null;
  const reached = canCompleteRecovery(session);
  const target = action.minutes * 60;
  const progress = Math.min(1, elapsed / target);
  const style = { "--timer-progress": `${progress * 360}deg` } as CSSProperties;

  return (
    <div className="screen focus-screen recovery-focus">
      <ScreenHeader eyebrow="现实恢复" title={action.title} />
      <div className="focus-domain recovery-domain">
        <span className="recovery-mark">{action.mark}</span>
        <span>恢复不会增加属性，但会保护长期行动能力</span>
      </div>
      <div className={`timer-orb recovery-orb ${reached ? "is-reached" : ""}`} style={style}>
        <div className="timer-orb__inner">
          <p>恢复时间</p>
          <strong>{formatDuration(elapsed)}</strong>
          <span>{reached ? "可以结束本次恢复" : `还需 ${formatDuration(Math.max(0, target - elapsed), false)}`}</span>
        </div>
      </div>
      <section className="recovery-objective">
        <strong>{action.objective}</strong>
        <p>{action.detail}</p>
      </section>
      <button className="primary-button primary-button--large" type="button" disabled={!reached} onClick={onComplete}>
        {reached ? "完成恢复" : `恢复满 ${action.minutes} 分钟后可完成`}
      </button>
      <button className="text-danger" type="button" onClick={onAbandon}>结束但不记录</button>
      <p className="focus-persistence">离开或锁屏后，恢复计时仍按真实时间计算</p>
    </div>
  );
}

function FocusScreen({
  state,
  elapsed,
  onPick,
  onAbandon,
  onComplete,
}: {
  state: GameState;
  elapsed: number;
  onPick: () => void;
  onAbandon: () => void;
  onComplete: (note: string, image?: File) => Promise<void>;
}) {
  const [showComplete, setShowComplete] = useState(false);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File>();
  const [photoPreview, setPhotoPreview] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [realityConfirmed, setRealityConfirmed] = useState(false);

  const session = state.sessions.find((item) => item.id === state.activeSessionId);
  if (!session) return <EmptyFocus onPick={onPick} />;
  const quest = getQuest(state, session.questId);
  if (!quest) return <EmptyFocus onPick={onPick} />;

  const usesReferenceTime =
    session.timingMode === "timed" ||
    (session.timingMode === undefined && questUsesReferenceTime(quest));
  const targetSeconds = session.plannedMinutes * 60;
  const reached = usesReferenceTime
    ? hasReachedSessionReference(session)
    : true;
  const progress = usesReferenceTime
    ? Math.min(1, elapsed / targetSeconds)
    : 1;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const timerStyle = { "--timer-progress": `${progress * 360}deg` } as CSSProperties;

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submitComplete = async () => {
    if (submitting || !realityConfirmed) return;
    setSubmitting(true);
    await onComplete(note, photo);
    setSubmitting(false);
    setShowComplete(false);
  };

  return (
    <div className="screen focus-screen">
      <ScreenHeader eyebrow="行动正在发生" title={quest.title} />
      <div className="focus-domain">
        <DomainMark domain={quest.domain} compact />
        <span>{DOMAIN_META[quest.domain].name} · 完成后 {DOMAIN_META[quest.domain].attribute} +1</span>
      </div>

      {session.firstStep && (
        <section className="focus-first-step">
          <span>现实第一步</span>
          <p>{session.firstStep}</p>
        </section>
      )}

      <div className={`timer-orb ${reached ? "is-reached" : ""} ${usesReferenceTime ? "" : "result-orb"}`} style={timerStyle}>
        <div className="timer-orb__inner">
          <p>{usesReferenceTime ? "实际行动" : "行动记录"}</p>
          <strong>{formatDuration(elapsed)}</strong>
          <span>
            {usesReferenceTime
              ? reached
                ? "已达到参考时间"
                : `距离参考时间 ${formatDuration(remaining, false)}`
              : "完成现实目标后，随时可以记录"}
          </span>
        </div>
      </div>

      <div className="focus-target">
        <div>
          <span>{usesReferenceTime ? "参考目标" : "完成标准"}</span>
          <strong>{usesReferenceTime ? `${session.plannedMinutes} 分钟` : "现实结果"}</strong>
        </div>
        <div>
          <span>当前状态</span>
          <strong className={reached ? "status-reached" : ""}>
            {usesReferenceTime
              ? reached
                ? "达到参考"
                : "行动中"
              : "等待确认"}
          </strong>
        </div>
      </div>

      <blockquote>“不必追赶时间，只需忠实于此刻的行动。”</blockquote>

      <button className="primary-button primary-button--large" type="button" onClick={() => setShowComplete(true)}>
        已完成，记录成果
      </button>
      {usesReferenceTime && !reached && (
        <p className="completion-availability">
          已在现实中完成？即使还没到参考时间，也可以现在记录。
        </p>
      )}
      <button className="text-danger" type="button" onClick={onAbandon}>放弃本次任务</button>
      <p className="focus-persistence">离开或锁屏后，计时仍按真实时间计算</p>

      {showComplete && (
        <div className="sheet-backdrop" role="presentation">
          <section className="bottom-sheet completion-sheet" role="dialog" aria-modal="true" aria-labelledby="complete-title">
            <div className="sheet-handle" />
            <div className="completion-symbol" aria-hidden>成</div>
            <p className="eyebrow">一次真实行动已完成</p>
            <h2 id="complete-title">为此刻留下回忆</h2>
            <p className="completion-copy">照片和文字只属于你，也可以稍后再回看。</p>
            <label className="reality-confirm">
              <input
                type="checkbox"
                checked={realityConfirmed}
                onChange={(event) => setRealityConfirmed(event.target.checked)}
              />
              <span>
                <strong>我确认现实目标确实发生了</strong>
                <small>参考时间只是辅助；现实目标完成，才算真正完成。</small>
              </span>
            </label>
            <label className="memory-photo">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="准备保存的成长照片" />
              ) : (
                <>
                  <span aria-hidden>＋</span>
                  <strong>添加一张照片</strong>
                  <small>自动压缩后保存在本机</small>
                </>
              )}
              <input type="file" accept="image/*" onChange={choosePhoto} />
            </label>
            <label className="field">
              <span>一句记录（可选）</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={160} rows={3} placeholder="此刻，你看见了什么？" />
            </label>
            <button className="primary-button" type="button" disabled={submitting || !realityConfirmed} onClick={submitComplete}>
              {submitting ? "正在保存…" : realityConfirmed ? "收下这次成长" : "请先确认现实目标"}
            </button>
            <button
              className="plain-button"
              type="button"
              onClick={async () => {
                if (submitting || !realityConfirmed) return;
                setSubmitting(true);
                await onComplete("", undefined);
                setSubmitting(false);
                setShowComplete(false);
              }}
              disabled={submitting || !realityConfirmed}
            >
              跳过记录，直接完成
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function ActionCalendar({
  state,
  currentTime,
}: {
  state: GameState;
  currentTime: number;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState(
    localDateKey(currentTime),
  );
  const streaks = actionStreaks(state);
  const completedByDay = new Map<string, number>();
  state.sessions.forEach((session) => {
    if (session.status !== "completed" || !session.completedAt) return;
    const key = localDateKey(session.completedAt);
    completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
  });
  const today = new Date(currentTime);
  const visibleMonth = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1,
    12,
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
  const leadingBlanks = (visibleMonth.getDay() + 6) % 7;
  const todayDateKey = localDateKey(currentTime);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1, 12);
    const key = localDateKey(date);
    return {
      key,
      label: index + 1,
      count: completedByDay.get(key) ?? 0,
      future: key > todayDateKey,
      today: key === todayDateKey,
    };
  });
  const selectedActions = selectedKey
    ? state.sessions
        .filter(
          (session) =>
            session.status === "completed" &&
            session.completedAt &&
            localDateKey(session.completedAt) === selectedKey,
        )
        .flatMap((session) => {
          const quest = getQuest(state, session.questId);
          return quest ? [{ session, quest }] : [];
        })
    : [];
  const selectedDate = selectedKey
    ? new Date(`${selectedKey}T12:00:00`)
    : undefined;
  const changeMonth = (delta: number) => {
    setMonthOffset((current) => Math.min(0, current + delta));
    setSelectedKey("");
  };

  return (
    <section className="action-calendar">
      <div className="calendar-heading">
        <div>
          <p>真实冒险日历</p>
          <h2>
            <span>{year}</span><small>年</small><span>{month + 1}</span><small>月</small>
          </h2>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="上一个月">‹</button>
          {monthOffset < 0 && (
            <button className="calendar-today" type="button" onClick={() => {
              setMonthOffset(0);
              setSelectedKey(todayDateKey);
            }}>本月</button>
          )}
          <button type="button" disabled={monthOffset >= 0} onClick={() => changeMonth(1)} aria-label="下一个月">›</button>
        </div>
      </div>
      <div className="streak-metrics">
        <div><strong>{streaks.current}</strong><span>当前连续</span></div>
        <div><strong>{streaks.longest}</strong><span>最长连续</span></div>
        <div><strong>{streaks.activeDays}</strong><span>累计活跃</span></div>
      </div>
      <div className="calendar-weekdays" aria-hidden>
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid" aria-label={`${year} 年 ${month + 1} 月行动日历`}>
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span className="calendar-blank" key={`blank-${index}`} />
        ))}
        {days.map((day) => (
          <button
            type="button"
            className={`intensity-${Math.min(3, day.count)} ${day.future ? "is-future" : ""} ${day.today ? "is-today" : ""} ${selectedKey === day.key ? "is-selected" : ""}`}
            key={day.key}
            title={`${day.key}：${day.count} 次行动`}
            aria-label={`${month + 1} 月 ${day.label} 日，${day.count} 次行动${day.future ? "，未来日期" : ""}`}
            disabled={day.future}
            onClick={() => setSelectedKey(day.key)}
          >
            <span>{day.label}</span>
            {day.count > 0 && <i>{day.count > 9 ? "9+" : day.count}</i>}
          </button>
        ))}
      </div>
      {selectedDate && (
        <div className="calendar-day-detail">
          <div>
            <span>{formatDate(selectedDate.toISOString())}</span>
            <strong>{selectedActions.length > 0 ? `${selectedActions.length} 次真实行动` : "没有行动记录"}</strong>
          </div>
          {selectedActions.length > 0 ? (
            <div className="calendar-day-actions">
              {selectedActions.map(({ session, quest }) => (
                <article key={session.id}>
                  <DomainMark domain={quest.domain} compact />
                  <div>
                    <strong>{quest.title}</strong>
                    <small>{formatMinutes(session.finalDurationSeconds ?? 0)} · {DOMAIN_META[quest.domain].attribute} +1</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p>这一天可以休息。空白不会扣分，也不会否定此前的成长。</p>
          )}
        </div>
      )}
      <p className="gentle-rule">连续天数只用于回望节奏；休息或错过不会扣属性、清空计划或制造失败。</p>
    </section>
  );
}


function GrowthScreen({
  state,
  currentTime,
}: {
  state: GameState;
  currentTime: number;
}) {
  const profile = state.profile!;
  const levelState = levelProgress(profile.experience);
  const memories = [...state.memories]
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )
    .slice(0, 12);
  const coreDomains: Domain[] = [
    "fitness",
    "learning",
    "creation",
    "discipline",
    "social",
  ];
  const mapUnlockLevels: Record<Domain, number> = {
    fitness: 1,
    learning: 1,
    creation: 2,
    discipline: 2,
    social: 3,
    exploration: 4,
  };

  return (
    <div className="screen growth-screen growth-screen--v002">
      <ScreenHeader eyebrow="现实成长可视化" title="人生探索地图" />

      <section className="map-level-summary">
        <span>LV.{profile.level}</span>
        <div>
          <p>现实人生 RPG</p>
          <h2>{profile.mainGoal}</h2>
          <div><i style={{ width: `${levelState.ratio * 100}%` }} /></div>
          <small>再获得 {levelState.required - levelState.current} EXP 升级</small>
        </div>
      </section>

      <section className="life-map-section">
        <div className="section-heading">
          <div><p>人生地图</p><h2>你走过的地方，才会真正点亮</h2></div>
          <span>{DOMAIN_ORDER.filter((domain) => domainStats(state, domain).completions > 0).length} / 6</span>
        </div>
        <div className="life-continent-map">
          {DOMAIN_ORDER.map((domain) => {
            const meta = DOMAIN_META[domain];
            const count = domainStats(state, domain).completions;
            const unlockLevel = mapUnlockLevels[domain];
            const levelLocked = profile.level < unlockLevel;
            const worldState = levelLocked ? "locked" : worldStateFor(state, domain);
            return (
              <article className={`life-continent life-continent--${worldState} domain-${domain}`} key={domain}>
                <div className="life-continent__terrain" aria-hidden>
                  <span>{levelLocked ? "◇" : meta.mark}</span>
                  <i />
                </div>
                <div>
                  <small>{levelLocked ? `LV.${unlockLevel} 解锁` : count > 0 ? "地图已点亮" : "等待第一步"}</small>
                  <h3>{meta.world}</h3>
                  <p>{levelLocked ? "继续在现实中升级，迷雾会逐渐散开。" : meta.description}</p>
                </div>
                <strong>{levelLocked ? "锁" : `${count} 次`}</strong>
              </article>
            );
          })}
        </div>
      </section>

      <section className="core-attributes">
        <div className="section-heading">
          <div><p>五项核心属性</p><h2>属性只来自对应的现实行动</h2></div>
        </div>
        <div className="attribute-grid attribute-grid--five">
          {coreDomains.map((domain) => {
            const meta = DOMAIN_META[domain];
            const value = profile.attributes[meta.attributeKey];
            return (
              <article className={`attribute-card domain-${domain}`} key={domain}>
                <DomainMark domain={domain} />
                <div><span>{meta.name}</span><h3>{meta.attribute}</h3></div>
                <strong>{value}</strong>
                <small>{value === 0 ? "等待第一次行动" : `由 ${value} 次现实行动形成`}</small>
              </article>
            );
          })}
        </div>
      </section>

      <ActionCalendar state={state} currentTime={currentTime} />

      <section className="memory-section">
        <div className="section-heading">
          <div><p>成长回忆</p><h2>真实发生过的时刻</h2></div>
          <span>{state.memories.length}</span>
        </div>
        {memories.length ? (
          <div className="memory-list">
            {memories.map((memory) => <MemoryCard memory={memory} key={memory.id} />)}
          </div>
        ) : (
          <div className="empty-memory"><span>忆</span><p>完成现实任务后，这里会留下你的成长轨迹。</p></div>
        )}
      </section>
    </div>
  );
}
function MemoryCard({ memory }: { memory: GrowthMemory }) {
  return (
    <article className={`memory-card ${memory.photoDataUrl ? "has-photo" : ""}`}>
      {memory.photoDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={memory.photoDataUrl} alt={`${memory.questTitle}的成长回忆`} />
      )}
      <div className="memory-card__body">
        <div>
          <DomainMark domain={memory.domain} compact />
          <span>{formatDate(memory.completedAt)} · {formatMinutes(memory.durationSeconds)}</span>
        </div>
        <h3>{memory.questTitle}</h3>
        {memory.note && <p>“{memory.note}”</p>}
      </div>
    </article>
  );
}

function RewardVault({
  state,
  onCreate,
  onRedeem,
}: {
  state: GameState;
  onCreate: (reward: RealReward) => void;
  onRedeem: (reward: RealReward) => void;
}) {
  const [showCreator, setShowCreator] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(50);
  const [limit, setLimit] = useState(1);
  const [drawnRewardId, setDrawnRewardId] = useState("");

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(
    startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1),
  );

  const weeklyCount = (rewardId: string) =>
    state.rewardRedemptions.filter(
      (redemption) =>
        redemption.rewardId === rewardId &&
        new Date(redemption.redeemedAt) >= startOfWeek,
    ).length;
  const orderedRewards = useMemo(
    () => [...state.realRewards].sort((left, right) => left.pointCost - right.pointCost),
    [state.realRewards],
  );
  const drawableRewards = orderedRewards.filter(
    (reward) => weeklyCount(reward.id) < reward.weeklyLimit,
  );
  const featuredReward =
    orderedRewards.find((reward) => reward.id === drawnRewardId) ??
    drawableRewards[0] ??
    orderedRewards[0];
  const featuredRedeemed = featuredReward ? weeklyCount(featuredReward.id) : 0;
  const featuredLimitReached = featuredReward
    ? featuredRedeemed >= featuredReward.weeklyLimit
    : false;
  const featuredCanAfford = featuredReward
    ? (state.profile?.actionPoints ?? 0) >= featuredReward.pointCost
    : false;
  const drawReward = () => {
    if (drawableRewards.length === 0) return;
    const currentIndex = drawableRewards.findIndex(
      (reward) => reward.id === featuredReward?.id,
    );
    const step =
      drawableRewards.length === 1
        ? 0
        : 1 + Math.floor(Math.random() * (drawableRewards.length - 1));
    const nextIndex = (Math.max(0, currentIndex) + step) % drawableRewards.length;
    setDrawnRewardId(drawableRewards[nextIndex].id);
  };
  const milestoneRewards = [
    { target: 10, title: "安排一次认真庆祝" },
    { target: 30, title: "为自己添一件喜欢的东西" },
    { target: 60, title: "完成一次旅行或完整休息" },
  ];
  const nextMilestone =
    milestoneRewards.find(
      (milestone) => (state.profile?.totalCompletions ?? 0) < milestone.target,
    ) ?? milestoneRewards[milestoneRewards.length - 1];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2 || cost < 1) return;
    onCreate({
      id: createId("real-reward"),
      name: name.trim(),
      description: description.trim() || "这是你用真实行动为自己赢得的奖励。",
      mark: name.trim().slice(0, 1),
      pointCost: Math.max(1, Math.min(9999, cost)),
      weeklyLimit: Math.max(1, Math.min(7, limit)),
      isCustom: true,
      createdAt: new Date().toISOString(),
    });
    setName("");
    setDescription("");
    setCost(50);
    setLimit(1);
    setShowCreator(false);
  };

  return (
    <section className="reward-vault">
      <div className="section-heading section-heading--compact">
        <div><p>现实奖励</p><h2>成长要在现实里兑现</h2></div>
        <button type="button" onClick={() => setShowCreator(true)}>＋ 添加愿望</button>
      </div>
      <div className="point-balance">
        <span className="point-symbol" aria-hidden>焰</span>
        <div><small>可用行动点</small><strong>{state.profile?.actionPoints ?? 0}</strong></div>
        <p>只能由正式完成的现实行动获得</p>
      </div>
      <div className="reward-milestone-card">
        <span>{Math.min(state.profile?.totalCompletions ?? 0, nextMilestone.target)} / {nextMilestone.target}</span>
        <div>
          <small>下一阶段奖励建议</small>
          <strong>{nextMilestone.title}</strong>
          <p>APP 只负责提醒；奖励由你根据预算和真实目标亲自兑现。</p>
        </div>
      </div>
      {featuredReward && (
        <div className="reward-draw">
          <span className="reward-draw__seal" aria-hidden>{featuredReward.mark}</span>
          <div className="reward-draw__copy">
            <small>今日奖励签</small>
            <strong>{featuredReward.name}</strong>
            <p>{featuredReward.description}</p>
            <span>{featuredReward.pointCost} 行动点 · 本周 {featuredRedeemed}/{featuredReward.weeklyLimit}</span>
          </div>
          <div className="reward-draw__actions">
            <button type="button" onClick={drawReward}>换一张</button>
            <button
              className="reward-draw__redeem"
              type="button"
              disabled={!featuredCanAfford || featuredLimitReached}
              onClick={() => onRedeem(featuredReward)}
            >
              {featuredLimitReached
                ? "本周已兑"
                : featuredCanAfford
                  ? "兑现奖励"
                  : `还差 ${featuredReward.pointCost - (state.profile?.actionPoints ?? 0)} 点`}
            </button>
          </div>
          <p className="reward-draw__hint">换签不扣行动点；只有真正兑现时才会扣除。</p>
        </div>
      )}
      <div className="real-reward-list">
        {orderedRewards.map((reward) => {
          const redeemed = weeklyCount(reward.id);
          const limitReached = redeemed >= reward.weeklyLimit;
          const canAfford = (state.profile?.actionPoints ?? 0) >= reward.pointCost;
          return (
            <article key={reward.id}>
              <span className="reward-mark">{reward.mark}</span>
              <div>
                <h3>{reward.name}</h3>
                <p>{reward.description}</p>
                <small>本周 {redeemed}/{reward.weeklyLimit} 次</small>
                <div className="reward-goal-progress">
                  <i style={{ width: `${Math.min(100, ((state.profile?.actionPoints ?? 0) / reward.pointCost) * 100)}%` }} />
                </div>
              </div>
              <button
                type="button"
                disabled={!canAfford || limitReached}
                onClick={() => onRedeem(reward)}
              >
                {limitReached ? "本周已兑" : canAfford ? `${reward.pointCost} 点兑换` : `还差 ${reward.pointCost - (state.profile?.actionPoints ?? 0)} 点`}
              </button>
            </article>
          );
        })}
      </div>
      <p className="gentle-rule">奖励应帮助休息、庆祝或体验生活；不要设置伤害健康、超出预算或让自己后悔的奖励。</p>

      {showCreator && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={() => setShowCreator(false)}>
          <section className="bottom-sheet reward-creator" role="dialog" aria-modal="true" aria-labelledby="reward-create-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div><p>把成长兑现到现实</p><h2 id="reward-create-title">自定义奖励</h2></div>
              <button type="button" onClick={() => setShowCreator(false)} aria-label="关闭">×</button>
            </div>
            <form className="creator-form" onSubmit={submit}>
              <label className="field">
                <span>奖励名称</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} placeholder="例如：去吃一直想吃的餐厅" autoFocus />
              </label>
              <label className="field">
                <span>给自己的兑现说明</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={100} rows={3} placeholder="怎样认真享受这份奖励？" />
              </label>
              <div className="form-split">
                <label className="field">
                  <span>需要行动点</span>
                <input type="number" min={1} max={9999} value={cost} onChange={(event) => setCost(Number(event.target.value))} />
                </label>
                <label className="field">
                  <span>每周最多</span>
                  <input type="number" min={1} max={7} value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
                </label>
              </div>
              <button className="primary-button" type="submit" disabled={name.trim().length < 2}>保存现实奖励</button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function ProfileScreen({
  state,
  onImport,
  onClear,
  onSettings,
  onCreateReward,
  onRedeemReward,
  cloudStatus,
  installAvailable,
  isStandalone,
  onInstall,
  localOnly,
}: {
  state: GameState;
  onImport: (file: File) => Promise<void>;
  onClear: () => void;
  onSettings: (key: keyof GameState["settings"], value: boolean) => void;
  onCreateReward: (reward: RealReward) => void;
  onRedeemReward: (reward: RealReward) => void;
  cloudStatus: "checking" | "local" | "saving" | "synced" | "error";
  installAvailable: boolean;
  isStandalone: boolean;
  onInstall: () => void;
  localOnly: boolean;
}) {
  const [showDanger, setShowDanger] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const profile = state.profile!;
  const collection = equipmentCollection(state);
  const unlockedEquipment = collection.filter((equipment) => equipment.unlocked);
  const lockedEquipment = collection.filter((equipment) => !equipment.unlocked);
  const coreDomains: Domain[] = [
    "fitness",
    "learning",
    "creation",
    "discipline",
    "social",
  ];
  const titles = achievementsFor(state).filter((achievement) => achievement.unlocked);
  const levelState = levelProgress(profile.experience);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `觉醒玩家备份-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const chooseBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void onImport(file);
    event.target.value = "";
  };

  return (
    <div className="screen profile-screen profile-screen--character">
      <ScreenHeader eyebrow="现实角色" title="我的玩家" />

      <section className="character-identity-card">
        <div className="profile-avatar">{profile.nickname.slice(0, 1)}</div>
        <div>
          <p>LV.{profile.level} · 觉醒玩家</p>
          <h2>{profile.nickname}</h2>
          <span>{profile.mainGoal}</span>
          <div className="character-exp"><i style={{ width: `${levelState.ratio * 100}%` }} /></div>
          <small>{levelState.current} / 100 EXP</small>
        </div>
      </section>

      <section className="character-section">
        <div className="section-heading">
          <div><p>属性</p><h2>现实行动形成的能力</h2></div>
        </div>
        <div className="character-attribute-list">
          {coreDomains.map((domain) => {
            const meta = DOMAIN_META[domain];
            return (
              <article className={`domain-${domain}`} key={domain}>
                <DomainMark domain={domain} compact />
                <span>{meta.attribute}</span>
                <strong>{profile.attributes[meta.attributeKey]}</strong>
              </article>
            );
          })}
        </div>
      </section>

      <section className="character-section equipment-section">
        <div className="section-heading">
          <div><p>装备</p><h2>真实成长掉落的收藏卡</h2></div>
          <span>{unlockedEquipment.length} / {EQUIPMENT_CARDS.length}</span>
        </div>
        {unlockedEquipment.length ? (
          <div className="equipment-card-grid">
            {unlockedEquipment.map((equipment) => (
              <article className={`equipment-card rarity-${equipment.rarity}`} key={equipment.id}>
                <EquipmentArtwork equipment={equipment} />
                <div>
                  <small>{equipment.rarity} · {equipment.attribute}</small>
                  <h3>{equipment.name}</h3>
                  <p>{equipment.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-equipment">
            <span aria-hidden>匣</span>
            <p>完成同一领域 3 次真实行动，第一件装备会在结算时掉落。</p>
          </div>
        )}
      </section>

      <section className="character-section backpack-section">
        <div className="section-heading">
          <div><p>背包</p><h2>尚未获得的装备线索</h2></div>
        </div>
        <div className="backpack-grid">
          {lockedEquipment.map((equipment) => {
            const count = domainStats(state, equipment.domain).completions;
            return (
              <article key={equipment.id}>
                <EquipmentArtwork equipment={equipment} locked />
                <div>
                  <small>LV.{equipment.unlockLevel} · {DOMAIN_META[equipment.domain].name}行动 {count} / {equipment.unlockCount}</small>
                  <strong>{equipment.name}</strong>
                  <span>完成对应现实成长后解锁</span>
                </div>
              </article>
            );
          })}
          {lockedEquipment.length === 0 && <p>当前版本装备已全部收集。新的装备图鉴将在后续版本扩展。</p>}
        </div>
      </section>

      <section className="character-section title-section">
        <div className="section-heading">
          <div><p>称号</p><h2>你真实战胜过的证明</h2></div>
          <span>{titles.length + state.bossVictories.length}</span>
        </div>
        <div className="title-chip-list">
          {titles.map((title) => (
            <span className={`title-chip title-chip--${title.tier}`} key={title.id}>
              <i>{title.mark}</i>{title.title}
            </span>
          ))}
          {state.bossVictories.map((victory) => (
            <span className="title-chip title-chip--boss" key={`${victory.bossId}-${victory.week}`}>
              <i>胜</i>现实破障者
            </span>
          ))}
          {titles.length === 0 && state.bossVictories.length === 0 && (
            <p>第一次真实行动完成后，你会获得第一个称号。</p>
          )}
        </div>
      </section>

      <RewardVault state={state} onCreate={onCreateReward} onRedeem={onRedeemReward} />

      <details className="profile-system-panel">
        <summary>本机、安装与体验设置</summary>
        <section className="account-card">
          <span aria-hidden>{cloudStatus === "synced" ? "云" : "机"}</span>
          <div>
            <h3>{localOnly ? "手机本地存档" : cloudStatus === "synced" ? "云端存档已同步" : "本机存档模式"}</h3>
            <p>{localOnly ? "成长保存在当前设备，请定期导出备份。" : "云端不可用时，本机记录仍会正常保存。"}</p>
          </div>
        </section>
        <section className="install-card">
          <div>
            <p>手机桌面入口</p>
            <h3>{isStandalone ? "已从手机桌面打开" : "像 App 一样打开觉醒玩家"}</h3>
            <span>安装后可全屏打开，并保留离线入口。</span>
          </div>
          <button type="button" disabled={isStandalone} onClick={onInstall}>
            {isStandalone ? "已安装" : installAvailable ? "添加到桌面" : "查看安装步骤"}
          </button>
        </section>
        <div className="settings-card">
          {([
            ["sound", "完成音效", "完成行动时播放简短声音"],
            ["haptics", "触觉反馈", "支持的设备会轻轻震动"],
            ["reducedMotion", "减少动画", "关闭粒子与大幅动效"],
          ] as const).map(([key, title, subtitle]) => (
            <label className="switch-row" key={key}>
              <span><strong>{title}</strong><small>{subtitle}</small></span>
              <input type="checkbox" checked={state.settings[key]} onChange={(event) => onSettings(key, event.target.checked)} />
            </label>
          ))}
        </div>
        <div className="backup-actions">
          <button type="button" onClick={exportBackup}><span>↓</span><div><strong>导出完整备份</strong><small>换手机前请先保存</small></div></button>
          <button type="button" onClick={() => fileRef.current?.click()}><span>↑</span><div><strong>从备份恢复</strong><small>恢复前会验证数据</small></div></button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={chooseBackup} />
        </div>
        {!showDanger ? (
          <button className="clear-trigger" type="button" onClick={() => setShowDanger(true)}>清除本机全部数据</button>
        ) : (
          <div className="danger-confirm">
            <p>这会永久清除玩家、任务、照片与成长记录，且无法撤销。</p>
            <div>
              <button type="button" onClick={() => setShowDanger(false)}>取消</button>
              <button type="button" onClick={onClear}>确认全部清除</button>
            </div>
          </div>
        )}
      </details>
      <p className="version-label">觉醒玩家 · V0.0.2 Real Life RPG</p>
    </div>
  );
}
function BottomNav({ tab, onChange, hasActive }: { tab: Tab; onChange: (tab: Tab) => void; hasActive: boolean }) {
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {NAV_ITEMS.map((item) => (
        <button className={tab === item.id ? "is-active" : ""} key={item.id} type="button" onClick={() => onChange(item.id)} aria-current={tab === item.id ? "page" : undefined}>
          <span className={item.id === "focus" && hasActive ? "has-pulse" : ""}>{item.mark}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

function Toast({ message }: { message: string }) {
  return <div className="toast" role="status">{message}</div>;
}

function InstallGuide({ onClose, localOnly }: { onClose: () => void; localOnly: boolean }) {
  return (
    <div className="sheet-backdrop install-guide-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bottom-sheet install-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-guide-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p>iPhone 桌面版</p>
            <h2 id="install-guide-title">把觉醒玩家变成 App</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <p className="install-guide__lead">
          请使用 Safari 打开当前网址，然后完成下面三步。安装后会全屏打开，{localOnly ? "成长记录会继续保存在这台手机。" : "成长记录仍会继续同步。"}
        </p>
        <ol className="install-guide__steps">
          <li>
            <span>1</span>
            <div><strong>点 Safari 的分享按钮</strong><small>图标是一个向上箭头的方框；新布局中也可能在“更多”菜单里。</small></div>
          </li>
          <li>
            <span>2</span>
            <div><strong>选择“添加到主屏幕”</strong><small>如果没看到，滑到底部进入“编辑操作”后添加。</small></div>
          </li>
          <li>
            <span>3</span>
            <div><strong>打开“作为网页 App 打开”并添加</strong><small>回到桌面，点击新的“觉醒玩家”图标即可进入。</small></div>
          </li>
        </ol>
        <div className="install-guide__result">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="./apple-touch-icon.png" alt="" />
          <div><strong>你的桌面图标已经准备好</strong><small>私人测试期间，只有你能进入和同步自己的成长记录。</small></div>
        </div>
        <button className="primary-button primary-button--large" type="button" onClick={onClose}>
          知道了，去添加
        </button>
      </section>
    </div>
  );
}

function CompletionReward({
  outcome,
  onHome,
  onGrowth,
}: {
  outcome: CompletionRewardOutcome;
  onHome: () => void;
  onGrowth: () => void;
}) {
  const meta = DOMAIN_META[outcome.domain];
  return (
    <div className="reward-overlay" role="dialog" aria-modal="true" aria-labelledby="reward-title">
      <div className="reward-particles" aria-hidden>
        {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
      </div>
      <section className={`reward-settlement domain-${outcome.domain}`}>
        <div className="reward-seal" aria-hidden>{outcome.levelUp ? "升" : outcome.bossDefeated ? "胜" : "成"}</div>
        <p className="eyebrow">真实行动结算</p>
        <h2 id="reward-title">{outcome.levelUp ? `升级至 LV.${outcome.level}` : "行动已完成"}</h2>
        <span className="reward-quest-name">{outcome.questTitle}</span>

        <div className="reward-gains">
          <article>
            <DomainMark domain={outcome.domain} compact />
            <div><small>{meta.attribute}</small><strong>+1</strong></div>
          </article>
          <article>
            <span className="point-symbol">焰</span>
            <div><small>行动点</small><strong>+{outcome.points}</strong></div>
          </article>
          <article>
            <span className="point-symbol">EXP</span>
            <div><small>玩家经验</small><strong>+{outcome.experience}</strong></div>
          </article>
        </div>

        {outcome.bossDefeated && (
          <div className="boss-victory-drop">
            <span aria-hidden>胜</span>
            <div><small>现实 Boss 已击败</small><strong>{outcome.bossDefeated}</strong></div>
          </div>
        )}

        {outcome.equipmentUnlocks.length > 0 && (
          <div className="equipment-drop">
            <p>装备掉落 · 来自真实成长</p>
            {outcome.equipmentUnlocks.map((equipment) => (
              <article key={equipment.id}>
                <EquipmentArtwork equipment={equipment} />
                <div>
                  <small>{equipment.rarity}装备</small>
                  <strong>{equipment.name}</strong>
                  <span>{equipment.description}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {(outcome.masteryTitle || outcome.achievements.length > 0) && (
          <div className="reward-unlocks">
            {outcome.masteryTitle && (
              <div><span>熟练度提升</span><strong>{outcome.masteryTitle}</strong></div>
            )}
            {outcome.achievements.map((title) => (
              <div key={title}><span>新成就</span><strong>{title}</strong></div>
            ))}
          </div>
        )}

        {outcome.bonusLabels.length > 0 && (
          <div className="reward-bonuses">
            {outcome.bonusLabels.map((label) => <span key={label}>✦ {label}</span>)}
          </div>
        )}
        <p className="reward-balance">行动点余额 {outcome.totalPoints}</p>
        <button className="primary-button primary-button--large" type="button" onClick={onHome}>
          收下奖励
          <span aria-hidden>→</span>
        </button>
        <button className="plain-button" type="button" onClick={onGrowth}>查看成长与成就</button>
      </section>
    </div>
  );
}

export default function Home() {
  const localOnly = isLocalOnlyHosting();
  const [state, setState] = useState<GameState>(() => createEmptyState());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [now, setNow] = useState(0);
  const [toast, setToast] = useState("");
  const [pendingQuest, setPendingQuest] = useState<Quest | null>(null);
  const [showRecoveryCamp, setShowRecoveryCamp] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<
    "checking" | "local" | "saving" | "synced" | "error"
  >(localOnly ? "local" : "checking");
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [completionReward, setCompletionReward] =
    useState<CompletionRewardOutcome | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudEnabled = useRef(false);

  useEffect(() => {
    void (async () => {
      let loaded = await loadGame();
      if (!localOnly) {
        try {
          const cloud = await loadCloudGame();
          if (cloud.status === "ready") {
            cloudEnabled.current = true;
            setCloudStatus("synced");
            if (
              cloud.state &&
              cloud.state.lastModifiedAt > loaded.lastModifiedAt
            ) {
              loaded = cloud.state;
              await saveGame(loaded);
            }
          } else {
            setCloudStatus("local");
          }
        } catch {
          setCloudStatus("error");
        }
      } else {
        setCloudStatus("local");
      }
      const openedAt = new Date().toISOString();
        const withTodayPlan =
          !loaded.profile || dailyPlanFor(loaded)
            ? loaded
            : {
              ...loaded,
              dailyPlans: [
                ...loaded.dailyPlans,
                buildDailyPlan(loaded, new Date()),
              ],
            };
      setState({
        ...withTodayPlan,
        metrics: {
          ...withTodayPlan.metrics,
          launches: withTodayPlan.metrics.launches + 1,
          firstOpenedAt: withTodayPlan.metrics.firstOpenedAt ?? openedAt,
          lastOpenedAt: openedAt,
        },
        lastModifiedAt: openedAt,
      });
      const requested = new URLSearchParams(window.location.search).get("tab");
      if (
        requested === "home" ||
        requested === "quests" ||
        requested === "focus" ||
        requested === "growth" ||
        requested === "profile"
      ) {
        setTab(requested);
        window.history.replaceState({}, "", window.location.pathname);
      }
      setNow(Date.now());
      setReady(true);
    })();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("./service-worker.js")
        .catch(() => undefined);
    }
  }, [localOnly]);

  useEffect(() => {
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      setShowInstallGuide(false);
    };
    const media = window.matchMedia("(display-mode: standalone)");
    const updateDisplayMode = () =>
      setIsStandalone(
        media.matches ||
        Boolean((navigator as NavigatorWithStandalone).standalone),
      );
    updateDisplayMode();
    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("appinstalled", installed);
    media.addEventListener?.("change", updateDisplayMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstall);
      window.removeEventListener("appinstalled", installed);
      media.removeEventListener?.("change", updateDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveGame(state);
    if (!state.profile || !cloudEnabled.current) return;
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(() => {
      setCloudStatus("saving");
      void saveCloudGame(state)
        .then((result) =>
          setCloudStatus(result.status === "saved" ? "synced" : "local"),
        )
        .catch(() => setCloudStatus("error"));
    }, 1200);
    return () => {
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
    };
  }, [ready, state]);

  useEffect(() => {
    if (!state.activeSessionId && !state.activeRecoveryId) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.activeRecoveryId, state.activeSessionId]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", state.settings.reducedMotion);
  }, [state.settings.reducedMotion]);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  };

  const updateState = (updater: (current: GameState) => GameState) => {
    setState((current) =>
      reconcileProgress({
        ...updater(current),
        lastModifiedAt: new Date().toISOString(),
      }),
    );
  };

  const activeSession = useMemo(
    () => state.sessions.find((session) => session.id === state.activeSessionId),
    [state.activeSessionId, state.sessions],
  );
  const activeQuest = activeSession ? getQuest(state, activeSession.questId) : undefined;
  const activeElapsed = activeSession ? elapsedSeconds(activeSession, now) : 0;
  const activeRecovery = useMemo(
    () =>
      state.recoverySessions.find(
        (session) => session.id === state.activeRecoveryId,
      ),
    [state.activeRecoveryId, state.recoverySessions],
  );
  const activeRecoveryAction = RECOVERY_ACTIONS.find(
    (action) => action.id === activeRecovery?.actionId,
  );
  const activeRecoveryElapsed = activeRecovery
    ? recoveryElapsedSeconds(activeRecovery, now)
    : 0;

  const createPlayer = (mainGoal: string) => {
    updateState((current) => {
      const next: GameState = {
        ...current,
        profile: {
        id: createId("player"),
        nickname: "玩家",
        mainGoal,
        createdAt: new Date().toISOString(),
        attributes: {
          intelligence: 0,
          strength: 0,
          creativity: 0,
          willpower: 0,
          charisma: 0,
          perception: 0,
        },
        totalCompletions: 0,
        totalActionSeconds: 0,
        actionPoints: 0,
        experience: 0,
        level: 1,
      },
      };
      return {
        ...next,
        dailyPlans: [...next.dailyPlans, buildDailyPlan(next, new Date())],
      };
    });
  };

  const requestQuestStart = (quest: Quest) => {
    if (activeSession || activeRecovery) {
      notify("已有一项行动正在进行");
      setTab("focus");
      return;
    }
    const unlockLevel = questUnlockLevel(quest);
    if ((state.profile?.level ?? 1) < unlockLevel) {
      notify(`达到 LV.${unlockLevel} 后解锁这项任务`);
      return;
    }
    if (isRestartQuest(quest) && completedRestartToday(state)) {
      notify("今天已经完成过一次五分钟重新启动");
      return;
    }
    setPendingQuest(quest);
  };

  const requestHomeQuestStart = (quest: Quest) => {
    if (quest.id === contextualQuest(state).id) {
      updateState((current) => ({
        ...current,
        metrics: {
          ...current.metrics,
          recommendationStarts: current.metrics.recommendationStarts + 1,
        },
      }));
    }
    requestQuestStart(quest);
  };

  const beginQuest = (
    quest: Quest,
    firstStep: string,
    plannedMinutes: number,
  ) => {
    const usesReferenceTime = questUsesReferenceTime(quest);
    const sessionId = createId("session");
    updateState((current) => ({
      ...current,
      activeSessionId: sessionId,
      launchPlans: {
        ...current.launchPlans,
        [quest.id]: firstStep,
      },
      launchMinutes: isRestartQuest(quest) || !usesReferenceTime
        ? current.launchMinutes
        : {
            ...current.launchMinutes,
            [quest.id]: plannedMinutes,
          },
      sessions: [
        ...current.sessions,
        {
          id: sessionId,
          questId: quest.id,
          status: "active",
          startedAt: new Date().toISOString(),
          plannedMinutes,
          timingMode: usesReferenceTime ? "timed" : "result",
          firstStep,
        },
      ],
    }));
    setPendingQuest(null);
    setNow(Date.now());
    setTab("focus");
  };

  const abandonQuest = () => {
    if (!activeSession || !window.confirm("确定放弃这次任务吗？本次行动不会增加属性。")) return;
    updateState((current) => ({
      ...current,
      activeSessionId: null,
      sessions: current.sessions.map((session) =>
        session.id === activeSession.id
          ? { ...session, status: "abandoned" as const }
          : session,
      ),
    }));
    notify("本次任务已放弃，没有获得属性点");
  };

  const finishQuest = async (note: string, photo?: File) => {
    const session = state.sessions.find((item) => item.id === state.activeSessionId);
    if (!session || session.status !== "active" || !canCompleteSession(session)) {
      notify("当前没有可完成的任务");
      return;
    }
    const quest = getQuest(state, session.questId);
    if (!quest) return;
    const completedAt = new Date().toISOString();
    const durationSeconds = elapsedSeconds(session);
    let photoDataUrl: string | undefined;
    if (photo) {
      try {
        photoDataUrl = await compressImage(photo);
      } catch {
        notify("照片未能保存，但任务已正常完成");
      }
    }
    const memory: GrowthMemory = {
      id: createId("memory"),
      questId: quest.id,
      questTitle: quest.title,
      domain: quest.domain,
      completedAt,
      durationSeconds,
      note: note.trim() || undefined,
      photoDataUrl,
    };
    const beforeAchievements = new Set(
      achievementsFor(state)
        .filter((achievement) => achievement.unlocked)
        .map((achievement) => achievement.id),
    );
    const beforeEquipment = new Set(
      equipmentCollection(state)
        .filter((equipment) => equipment.unlocked)
        .map((equipment) => equipment.id),
    );
    const beforeMastery = questMastery(state, quest.id);
    const completionCount = beforeMastery.count + 1;
    const masteryBonus = masteryPointBonus(completionCount);
    const basePoints = completionPointReward(quest);
    const todayPlan = dailyPlanFor(state);
    const planItems = todayPlan ? dailyPlanItems(state, todayPlan) : [];
    const planIndex = planItems.findIndex((item) => item.quest.id === quest.id);
    const planItem = planIndex >= 0
      ? planItems[planIndex]
      : undefined;
    const dailyBonus =
      todayPlan &&
      !todayPlan.claimedAt &&
      planItem &&
      !planItem.completed &&
      planItems.filter((item) => item.completed).length === 2
        ? 8
        : 0;
    const dailyExperienceBonus =
      !isRestDay() && planItem && !planItem.completed
        ? planIndex === 0
          ? 10
          : 5
        : 0;
    const encounter = dailyEncounterFor(state);
    const encounterExperienceBonus =
      encounter && encounter.quest.id === quest.id && !encounter.completed ? 5 : 0;
    const boss = weeklyBossFor(state);
    const currentBossWeek = weekKey();
    const bossAlreadyDefeated = state.bossVictories.some(
      (victory) =>
        victory.bossId === boss.id && victory.week === currentBossWeek,
    );
    const bossDefeated =
      !bossAlreadyDefeated &&
      boss.domains.includes(quest.domain) &&
      weeklyBossProgress(state, boss) + 1 >= boss.targetCount;
    const experienceReward =
      completionExperienceReward(quest) +
      dailyExperienceBonus +
      encounterExperienceBonus +
      (bossDefeated ? 50 : 0);
    const totalReward = basePoints + masteryBonus + dailyBonus;
    const rawNext: GameState = {
      ...state,
      lastModifiedAt: completedAt,
      activeSessionId: null,
      profile: state.profile
        ? {
            ...state.profile,
            actionPoints: state.profile.actionPoints + totalReward,
          }
        : null,
      sessions: state.sessions.map((item) =>
        item.id === session.id
          ? {
              ...item,
              status: "completed" as const,
              completedAt,
              finalDurationSeconds: durationSeconds,
              experienceEarned: experienceReward,
            }
          : item,
      ),
      memories: [...state.memories, memory],
      rewardedSessionIds: [...state.rewardedSessionIds, session.id],
      bossVictories: bossDefeated
        ? [
            ...state.bossVictories,
            { bossId: boss.id, week: currentBossWeek, defeatedAt: completedAt },
          ]
        : state.bossVictories,
      dailyPlans: state.dailyPlans.map((plan) =>
        dailyBonus > 0 && plan.date === todayPlan?.date
          ? { ...plan, claimedAt: completedAt }
          : plan,
      ),
    };
    const next = reconcileProgress(rawNext);
    const afterMastery = questMastery(next, quest.id);
    const newAchievements = achievementsFor(next).filter(
      (achievement) =>
        achievement.unlocked && !beforeAchievements.has(achievement.id),
    );
    const newEquipment = equipmentCollection(next).filter(
      (equipment) => equipment.unlocked && !beforeEquipment.has(equipment.id),
    );
    const bonusLabels: string[] = [];
    if (quest.difficulty === "challenge") bonusLabels.push("挑战行动加成");
    if (masteryBonus > 0) {
      bonusLabels.push(`熟练度里程碑 +${masteryBonus} 行动点`);
    }
    if (dailyBonus > 0) {
      bonusLabels.push("今日觉醒三步 +8 行动点");
    }
    if (dailyExperienceBonus > 0) {
      bonusLabels.push(
        planIndex === 0 ? "今日主线 +10 EXP" : "今日支线 +5 EXP",
      );
    }
    if (encounterExperienceBonus > 0) bonusLabels.push("今日奇遇 +5 EXP");
    if (bossDefeated) bonusLabels.push(`击败「${boss.title}」+50 EXP`);
    setState(next);
    setCompletionReward({
      questTitle: quest.title,
      domain: quest.domain,
      points: totalReward,
      experience: experienceReward,
      level: next.profile?.level ?? 1,
      levelUp: (next.profile?.level ?? 1) > (state.profile?.level ?? 1),
      bonusLabels,
      masteryTitle:
        afterMastery.rank.title !== beforeMastery.rank.title
          ? afterMastery.rank.title
          : undefined,
      achievements: newAchievements.map((achievement) => achievement.title),
      equipmentUnlocks: newEquipment,
      bossDefeated: bossDefeated ? boss.title : undefined,
      totalPoints: next.profile?.actionPoints ?? totalReward,
    });
    if (!localOnly && quest.communitySourceId) {
      void fetch("/api/community", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: quest.communitySourceId,
          action: "complete",
        }),
      }).catch(() => undefined);
    }
    if (state.settings.haptics && "vibrate" in navigator) navigator.vibrate([30, 40, 50]);
  };

  const createQuest = (quest: Quest) => {
    updateState((current) => ({ ...current, quests: [...current.quests, quest] }));
    notify("自定义任务已创建");
  };

  const publishCommunityQuest = async (quest: Quest) => {
    if (localOnly) return false;
    if (!state.profile) return false;
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quest,
        nickname: state.profile.nickname,
        totalCompletions: state.profile.totalCompletions,
      }),
    }).catch(() => null);
    return Boolean(response?.ok);
  };

  const adoptCommunityQuest = (communityQuest: CommunityQuest) => {
    if (
      state.quests.some(
        (quest) => quest.communitySourceId === communityQuest.id,
      )
    ) {
      notify("这项任务已经在你的任务列表里");
      return;
    }
    const adoptedQuest: Quest = {
      id: createId("community-quest"),
      title: communityQuest.title,
      description: communityQuest.description,
      domain: communityQuest.domain,
      plannedMinutes: communityQuest.plannedMinutes,
      difficulty: communityQuest.difficulty,
      isCustom: true,
      communitySourceId: communityQuest.id,
    };
    updateState((current) => ({
      ...current,
      quests: [...current.quests, adoptedQuest],
    }));
    if (!localOnly) {
      void fetch("/api/community", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: communityQuest.id, action: "adopt" }),
      }).catch(() => undefined);
    }
    notify(`已加入「${communityQuest.title}」`);
  };

  const createCourageLadder = (theme: CourageTheme) => {
    if (activeCourageLadder(state)) {
      notify("请先完成当前勇气阶梯");
      return;
    }
    const ladderId = createId("courage");
    const stepQuestIds = theme.steps.map(
      (_, index) => `${ladderId}-step-${index + 1}`,
    ) as [string, string, string, string];
    const quests: Quest[] = theme.steps.map((step, index) => ({
      id: stepQuestIds[index],
      title: step.title,
      description: step.description,
      domain: theme.domain,
      plannedMinutes: step.minutes,
      difficulty: index === 2 ? "challenge" : "normal",
      isCustom: false,
    }));
    const ladder: CourageLadder = {
      id: ladderId,
      themeId: theme.id,
      title: theme.title,
      domain: theme.domain,
      stepQuestIds,
      startedAt: new Date().toISOString(),
    };
    updateState((current) => ({
      ...current,
      quests: [...current.quests, ...quests],
      courageLadders: [...current.courageLadders, ladder],
    }));
    notify(`勇气阶梯「${theme.title}」已生成`);
  };

  const claimCourageLadder = (ladder: CourageLadder) => {
    if (
      ladder.claimedAt ||
      courageLadderProgress(state, ladder.stepQuestIds) < 4
    ) {
      notify("勇气阶梯尚未走完");
      return;
    }
    const claimedAt = new Date().toISOString();
    updateState((current) => {
      const latest = current.courageLadders.find(
        (item) => item.id === ladder.id,
      );
      if (
        !latest ||
        latest.claimedAt ||
        courageLadderProgress(current, latest.stepQuestIds) < 4
      ) {
        return current;
      }
      return {
        ...current,
        profile: current.profile
          ? {
              ...current.profile,
              actionPoints: current.profile.actionPoints + 12,
            }
          : null,
        courageLadders: current.courageLadders.map((item) =>
          item.id === ladder.id ? { ...item, claimedAt } : item,
        ),
      };
    });
    notify("勇气阶梯完成 · 获得 12 行动点");
  };

  const createRealReward = (reward: RealReward) => {
    updateState((current) => ({
      ...current,
      realRewards: [...current.realRewards, reward],
    }));
    notify("现实奖励已加入宝库");
  };

  const redeemRealReward = (reward: RealReward) => {
    if (!state.profile || state.profile.actionPoints < reward.pointCost) {
      notify("行动点还不够，先去完成一次真实行动");
      return;
    }
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(
      weekStart.getDate() -
        (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1),
    );
    const usedThisWeek = state.rewardRedemptions.filter(
      (redemption) =>
        redemption.rewardId === reward.id &&
        new Date(redemption.redeemedAt) >= weekStart,
    ).length;
    if (usedThisWeek >= reward.weeklyLimit) {
      notify("这项奖励本周已经达到上限");
      return;
    }
    if (
      !window.confirm(
        `确认花费 ${reward.pointCost} 行动点，兑现「${reward.name}」吗？`,
      )
    ) {
      return;
    }
    const redeemedAt = new Date().toISOString();
    updateState((current) => ({
      ...current,
      profile: current.profile
        ? {
            ...current.profile,
            actionPoints: current.profile.actionPoints - reward.pointCost,
          }
        : null,
      rewardRedemptions: [
        ...current.rewardRedemptions,
        {
          id: createId("redemption"),
          rewardId: reward.id,
          rewardName: reward.name,
          pointsSpent: reward.pointCost,
          redeemedAt,
        },
      ],
    }));
    notify(`已兑现「${reward.name}」· 请认真享受这份奖励`);
  };

  const startRecovery = (actionId: string) => {
    if (activeSession || activeRecovery) {
      notify("请先结束当前行动");
      setShowRecoveryCamp(false);
      setTab("focus");
      return;
    }
    const alreadyCompleted = state.recoverySessions.some(
      (session) =>
        session.actionId === actionId &&
        session.status === "completed" &&
        session.completedAt &&
        localDateKey(session.completedAt) === localDateKey(),
    );
    if (alreadyCompleted) {
      notify("今天已经完成过这项恢复");
      return;
    }
    const id = createId("recovery");
    updateState((current) => ({
      ...current,
      activeRecoveryId: id,
      recoverySessions: [
        ...current.recoverySessions,
        {
          id,
          actionId,
          status: "active",
          startedAt: new Date().toISOString(),
        },
      ],
    }));
    setShowRecoveryCamp(false);
    setNow(Date.now());
    setTab("focus");
  };

  const abandonRecovery = () => {
    if (
      !activeRecovery ||
      !window.confirm("确定结束本次恢复吗？未达到时间将不会保存。")
    ) {
      return;
    }
    updateState((current) => ({
      ...current,
      activeRecoveryId: null,
      recoverySessions: current.recoverySessions.map((session) =>
        session.id === activeRecovery.id
          ? { ...session, status: "abandoned" as const }
          : session,
      ),
    }));
    notify("本次恢复已结束");
  };

  const completeRecovery = () => {
    if (!activeRecovery || !canCompleteRecovery(activeRecovery)) {
      notify("尚未达到恢复时间");
      return;
    }
    const completedAt = new Date().toISOString();
    const duration = recoveryElapsedSeconds(activeRecovery);
    updateState((current) => ({
      ...current,
      activeRecoveryId: null,
      recoverySessions: current.recoverySessions.map((session) =>
        session.id === activeRecovery.id && session.status === "active"
          ? {
              ...session,
              status: "completed" as const,
              completedAt,
              finalDurationSeconds: duration,
            }
          : session,
      ),
    }));
    notify("恢复已记录 · 没有增加属性，但你保护了长期行动力");
    setTab("home");
  };

  const restoreBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const restored = await importBackup(parsed);
      setState({
        ...restored,
        lastModifiedAt: new Date().toISOString(),
      });
      setTab("home");
      notify("备份已安全恢复");
    } catch {
      notify("备份无效，原有数据未被改变");
    }
  };

  const resetAll = async () => {
    if (cloudEnabled.current) {
      await fetch("/api/sync", { method: "DELETE" }).catch(() => undefined);
    }
    const empty = await clearGame();
    setState(empty);
    setTab("home");
    notify("本机数据已清除");
  };

  if (!ready) return <LoadingScreen />;
  if (!state.profile) return <Onboarding onCreate={createPlayer} />;

  return (
    <main className="game-shell">
      <div className="ambient ambient--one" aria-hidden />
      <div className="ambient ambient--two" aria-hidden />
      <div className="game-viewport">
        {tab === "home" && (
          <HomeScreen
            state={state}
            activeQuest={activeQuest}
            activeElapsed={activeElapsed}
            currentTime={now}
            activeRecoveryTitle={activeRecoveryAction?.title}
            activeRecoveryElapsed={activeRecoveryElapsed}
            onNavigate={setTab}
            onStart={requestHomeQuestStart}
            onOpenRecovery={() => {
              if (activeRecovery) setTab("focus");
              else setShowRecoveryCamp(true);
            }}
          />
        )}
        {tab === "quests" && (
          <QuestScreen
            state={state}
            onStart={requestQuestStart}
            onCreate={createQuest}
            onPublish={publishCommunityQuest}
            onAdopt={adoptCommunityQuest}
            onCreateCourageLadder={createCourageLadder}
            onClaimCourageLadder={claimCourageLadder}
            localOnly={localOnly}
          />
        )}
        {tab === "focus" && (
          activeRecovery ? (
            <RecoveryFocusScreen
              state={state}
              elapsed={activeRecoveryElapsed}
              onAbandon={abandonRecovery}
              onComplete={completeRecovery}
            />
          ) : (
            <FocusScreen state={state} elapsed={activeElapsed} onPick={() => setTab("quests")} onAbandon={abandonQuest} onComplete={finishQuest} />
          )
        )}
        {tab === "growth" && <GrowthScreen state={state} currentTime={now} />}
        {tab === "profile" && (
          <ProfileScreen
            state={state}
            onImport={restoreBackup}
            onClear={resetAll}
            onSettings={(key, value) => updateState((current) => ({ ...current, settings: { ...current.settings, [key]: value } }))}
            onCreateReward={createRealReward}
            onRedeemReward={redeemRealReward}
            cloudStatus={cloudStatus}
            installAvailable={Boolean(installPrompt)}
            isStandalone={isStandalone}
            localOnly={localOnly}
            onInstall={() => {
              if (!installPrompt) {
                setShowInstallGuide(true);
                return;
              }
              void installPrompt.prompt();
              void installPrompt.userChoice.then(() => setInstallPrompt(null));
            }}
          />
        )}
      </div>
      <BottomNav tab={tab} onChange={setTab} hasActive={Boolean(activeSession || activeRecovery)} />
      {pendingQuest && (
        <QuestLaunchSheet
          key={pendingQuest.id}
          state={state}
          quest={pendingQuest}
          onClose={() => setPendingQuest(null)}
          onBegin={beginQuest}
        />
      )}
      {showRecoveryCamp && (
        <RecoveryCamp
          state={state}
          onClose={() => setShowRecoveryCamp(false)}
          onStart={startRecovery}
        />
      )}
      {completionReward && (
        <CompletionReward
          outcome={completionReward}
          onHome={() => {
            setCompletionReward(null);
            setTab("home");
          }}
          onGrowth={() => {
            setCompletionReward(null);
            setTab("growth");
          }}
        />
      )}
      {showInstallGuide && <InstallGuide localOnly={localOnly} onClose={() => setShowInstallGuide(false)} />}
      {toast && <Toast message={toast} />}
    </main>
  );
}
