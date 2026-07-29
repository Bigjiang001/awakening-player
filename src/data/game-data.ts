import type {
  AttributeKey,
  Domain,
  GrowthNode,
  Quest,
  QuestTag,
  RealReward,
} from "../domain/types";

export const DOMAIN_ORDER: Domain[] = [
  "learning",
  "fitness",
  "creation",
  "discipline",
  "social",
  "exploration",
];

export const DOMAIN_META: Record<
  Domain,
  {
    name: string;
    attribute: string;
    attributeKey: AttributeKey;
    mark: string;
    world: string;
    description: string;
  }
> = {
  learning: {
    name: "学习",
    attribute: "智力",
    attributeKey: "intelligence",
    mark: "智",
    world: "知识塔",
    description: "把好奇心炼成理解力",
  },
  fitness: {
    name: "运动",
    attribute: "力量",
    attributeKey: "strength",
    mark: "力",
    world: "训练场",
    description: "让身体成为可靠的同伴",
  },
  creation: {
    name: "创作",
    attribute: "创造",
    attributeKey: "creativity",
    mark: "创",
    world: "创作工坊",
    description: "把感受变成真实作品",
  },
  discipline: {
    name: "自律",
    attribute: "意志",
    attributeKey: "willpower",
    mark: "志",
    world: "秩序营地",
    description: "在选择中建立秩序",
  },
  social: {
    name: "社交",
    attribute: "魅力",
    attributeKey: "charisma",
    mark: "和",
    world: "同行广场",
    description: "真诚地连接与表达",
  },
  exploration: {
    name: "探索",
    attribute: "感知",
    attributeKey: "perception",
    mark: "观",
    world: "远望台",
    description: "走出边界，看见可能",
  },
};

const quest = (
  id: string,
  title: string,
  description: string,
  domain: Domain,
  plannedMinutes: number,
  difficulty: Quest["difficulty"] = "normal",
  tags: QuestTag[] = [],
): Quest => ({
  id,
  title,
  description,
  domain,
  plannedMinutes,
  difficulty,
  isCustom: false,
  tags,
});

export const DEFAULT_QUESTS: Quest[] = [
  quest("learn-read-10", "专注阅读", "翻开一本想读的书，专心读完一个适合自己的段落或章节。", "learning", 10),
  quest("learn-course-20", "完成一节课程", "跟完一节课程并记录一个要点。", "learning", 20),
  quest("learn-review-15", "复习旧知识", "重看笔记，找出三个关键概念。", "learning", 15),
  quest("learn-notes-25", "写知识卡片", "用自己的语言整理一张知识卡片。", "learning", 25),
  quest("learn-deep-45", "深度学习", "完成一段不被打扰的深度学习。", "learning", 45, "challenge"),

  quest("fit-walk-10", "出门走一走", "离开座位，让身体重新流动。", "fitness", 10),
  quest("fit-stretch-8", "舒展身体", "完成一组温和、完整的拉伸。", "fitness", 8),
  quest("fit-run-20", "轻松跑步", "按自己的节奏完成一次慢跑。", "fitness", 20),
  quest("fit-strength-20", "力量训练", "完成一组全身或局部力量训练。", "fitness", 20),
  quest("fit-endurance-40", "耐力突破", "完成一段持续耐力运动，并始终关注身体反馈。", "fitness", 40, "challenge"),

  quest("create-write-15", "自由写作", "不评判地写下一页当下的想法。", "creation", 15),
  quest("create-sketch-15", "画一张速写", "观察一个对象，并快速画下它。", "creation", 15),
  quest("create-photo-20", "完成一组拍摄", "围绕一个主题拍摄并选出一张。", "creation", 20),
  quest("create-polish-25", "推进一件作品", "让手头作品向完成再前进一步。", "creation", 25),
  quest("create-release-45", "公开一件作品", "完成、整理并发布一件小作品。", "creation", 45, "challenge"),

  quest("discipline-desk-10", "整理一处空间", "让眼前的一小块空间恢复秩序。", "discipline", 10),
  quest("discipline-plan-10", "写今日计划", "确定今天最重要的一件事。", "discipline", 10),
  quest("discipline-focus-25", "专注一件事", "关闭干扰，只推进当前任务。", "discipline", 25),
  quest("discipline-delay-15", "处理拖延事项", "完成一件被推迟的小事。", "discipline", 15),
  quest("discipline-morning-30", "完成晨间仪式", "按计划完成属于你的晨间流程。", "discipline", 30, "challenge"),

  quest("social-thanks-5", "认真感谢一个人", "把具体、真诚的感谢说出口。", "social", 5),
  quest("social-listen-15", "专心倾听", "放下判断，认真听完一次表达。", "social", 15),
  quest("social-contact-10", "联系一位朋友", "主动问候一个有段时间没联系的人。", "social", 10),
  quest("social-ask-10", "提出一个请求", "清晰表达需要，并允许对方选择。", "social", 10),
  quest("social-invite-20", "发起一次邀请", "邀请一个人共同完成一件有意义的事。", "social", 20, "challenge"),

  quest("explore-route-15", "走一条新路线", "换一条路，留意平常看不到的细节。", "exploration", 15),
  quest("explore-topic-20", "调研陌生主题", "查阅可靠资料，建立一个陌生主题的初步地图。", "exploration", 20),
  quest("explore-place-30", "造访新地点", "去一个从未认真看过的地方。", "exploration", 30),
  quest("explore-try-20", "尝试一件新事", "选择一个安全、微小的新体验。", "exploration", 20),
  quest("explore-career-45", "探索一种可能", "深入了解一个职业、领域或人生方向。", "exploration", 45, "challenge"),

  quest("english-shadow-10", "跟读一段英文", "选一段喜欢的英文音频，逐句模仿语音和节奏。", "learning", 10, "normal", ["popular", "english"]),
  quest("english-self-talk-10", "用英语介绍今天", "完成一段脱稿介绍，可以停顿，但不要因为不完美反复重来。", "learning", 10, "normal", ["english", "courage"]),
  quest("english-news-15", "读懂一条英文新闻", "阅读可靠来源的一条短新闻，用中文或英文写下三点。", "learning", 15, "normal", ["english", "upgrade"]),
  quest("english-voice-10", "发出一条英文语音", "给学习伙伴或可信朋友发送一段真实英文语音。", "social", 10, "challenge", ["popular", "english", "courage"]),
  quest("english-email-15", "写一封实用英文邮件", "围绕真实需求写一封简短、礼貌、可发送的英文邮件。", "learning", 15, "normal", ["english", "upgrade"]),
  quest("english-use-words-10", "让五个单词真正开口", "选五个学过的词，各造一句与你生活有关的话并说出来。", "learning", 10, "normal", ["english"]),
  quest("english-video-20", "无字幕看懂一段视频", "选择难度合适的短视频，先无字幕观看，再核对理解。", "learning", 20, "normal", ["popular", "english"]),
  quest("english-exchange-15", "开启一次语言交换", "向真实学习伙伴发出友好邀请，约定一次短交流。", "social", 15, "challenge", ["english", "courage"]),

  quest("fatloss-brisk-walk-30", "完成一次轻快步行", "按能说短句的强度快走，注意路况和身体感受。", "fitness", 30, "normal", ["popular", "fat-loss"]),
  quest("fatloss-postmeal-15", "饭后轻松散步", "在身体舒适时轻松步行，不把运动当作进食惩罚。", "fitness", 15, "normal", ["fat-loss"]),
  quest("fatloss-strength-20", "完成新手力量循环", "在安全前提下完成深蹲、推、拉或核心的基础循环。", "fitness", 20, "normal", ["popular", "fat-loss", "upgrade"]),
  quest("fatloss-dance-20", "跟喜欢的歌跳起来", "选几首喜欢的歌，让身体连续活动并保持愉快。", "fitness", 20, "normal", ["popular", "fat-loss", "creative"]),
  quest("fatloss-stairs-10", "安全走一段楼梯", "量力完成楼梯或坡度步行；膝踝不适时改为平地。", "fitness", 10, "normal", ["fat-loss"]),
  quest("fatloss-balanced-meal-20", "准备一顿均衡正餐", "为一顿饭安排蛋白质、蔬果和合适主食，不极端节食。", "discipline", 20, "normal", ["popular", "fat-loss"]),
  quest("fatloss-snack-10", "准备一份可靠加餐", "准备水果、奶类、坚果或其他适合自己的正常加餐。", "discipline", 10, "normal", ["fat-loss"]),
  quest("fatloss-meal-prep-30", "为明天准备一餐", "提前处理食材或装好一餐，让忙碌时也有正常选择。", "discipline", 30, "normal", ["fat-loss", "upgrade"]),
  quest("fatloss-grocery-15", "写一份理性采购单", "围绕几顿正常餐食列清单，减少冲动购买而非禁止食物。", "discipline", 15, "normal", ["fat-loss"]),
  quest("fatloss-sleep-20", "为睡眠提前收尾", "调暗灯光、放下刺激内容，为稳定睡眠做完整准备。", "discipline", 20, "normal", ["fat-loss", "upgrade"]),
  quest("fatloss-hike-45", "完成一次户外长走", "选择安全路线和合适装备，完成一次不追求极限的长走。", "fitness", 45, "challenge", ["fat-loss", "courage"]),

  quest("brave-camera-10", "对镜头完成一次表达", "录下一段不剪辑的真实表达，只看内容，不攻击外貌。", "social", 10, "normal", ["popular", "courage"]),
  quest("brave-question-10", "在公开场合问一个问题", "在课堂、会议或活动中提出一个真实而尊重的问题。", "social", 10, "challenge", ["popular", "courage", "upgrade"]),
  quest("brave-boundary-10", "温和地拒绝一次", "对不合适的请求清楚表达边界，不必过度解释。", "discipline", 10, "challenge", ["courage", "upgrade"]),
  quest("brave-compliment-5", "说出一次具体欣赏", "向合适的人表达具体、真诚且不冒犯的欣赏。", "social", 5, "normal", ["popular", "courage"]),
  quest("brave-reconnect-10", "联系很久没见的人", "发出一条真诚、没有强迫回应的问候。", "social", 10, "normal", ["popular", "courage"]),
  quest("brave-event-alone-45", "独自参加一次活动", "选择安全可靠的公开活动，独自到场并停留一段时间。", "exploration", 45, "challenge", ["popular", "courage"]),
  quest("brave-solo-cafe-30", "独自去喜欢的店坐坐", "在安全地点独处一会，观察环境，不用手机填满全程。", "exploration", 30, "normal", ["popular", "courage", "creative"]),
  quest("brave-apply-25", "投出一次机会申请", "向真实岗位、项目、比赛或活动提交一次认真申请。", "exploration", 25, "challenge", ["courage", "upgrade"]),
  quest("brave-imperfect-post-20", "发布一件不完美作品", "完成基本检查后公开发布，不再用无限修改拖延。", "creation", 20, "challenge", ["popular", "courage", "creative"]),
  quest("brave-hard-talk-20", "开始一次困难对话", "选择安全时机，陈述事实、感受和具体请求，并尊重对方。", "social", 20, "challenge", ["courage", "upgrade"]),

  quest("upgrade-roadmap-20", "画一张技能升级地图", "选一项想提升的能力，写出现状、目标和未来三步。", "learning", 20, "normal", ["popular", "upgrade"]),
  quest("upgrade-teachback-15", "把知识讲给别人听", "用自己的话讲清一个概念，找出仍然说不明白的地方。", "learning", 15, "normal", ["upgrade"]),
  quest("upgrade-resume-15", "升级一条简历经历", "把一段经历改成行动、方法和可验证结果。", "discipline", 15, "normal", ["popular", "upgrade"]),
  quest("upgrade-money-20", "看清最近的消费", "回看近期支出，找出一项值得保留和一项可以调整的选择。", "discipline", 20, "normal", ["upgrade"]),
  quest("upgrade-portfolio-30", "完善一页作品集", "补充一个项目的背景、过程和结果，让别人更容易理解。", "creation", 30, "normal", ["popular", "upgrade"]),
  quest("upgrade-presentation-15", "完成一次站立表达", "围绕一个主题完成一次计时表达，并回听一个可改进点。", "social", 15, "normal", ["courage", "upgrade"]),
  quest("upgrade-network-15", "完成一次有内容的自我介绍", "向真实对象说明你是谁、在做什么以及希望了解什么。", "social", 15, "challenge", ["courage", "upgrade"]),
  quest("upgrade-interview-30", "模拟一次真实面试", "针对目标岗位回答三个常见问题，并记录需要补强之处。", "exploration", 30, "challenge", ["upgrade"]),

  quest("creative-one-minute-film-30", "拍一支微电影", "围绕今天的一个瞬间，完成短片拍摄、选择和简单剪辑。", "creation", 30, "normal", ["popular", "creative"]),
  quest("creative-photo-hunt-20", "完成五种颜色摄影寻宝", "在安全范围内找到五种颜色，各拍一张有构图的照片。", "creation", 20, "normal", ["creative"]),
  quest("creative-future-audio-15", "给一年后的自己录音", "说清现在的状态、正在努力的事和希望记住的一句话。", "creation", 15, "normal", ["popular", "creative", "upgrade"]),
  quest("creative-micro-adventure-30", "完成一次随机微冒险", "选一个没去过的附近地点，确认安全后亲自走到那里。", "exploration", 30, "normal", ["popular", "creative"]),
  quest("creative-cook-30", "做一道从没做过的菜", "选择难度合适的食谱，安全完成并认真品尝。", "creation", 30, "normal", ["creative", "upgrade"]),
  quest("creative-phonefree-30", "完成一次无手机散步", "在安全熟悉的路线散步，把手机收好并观察十个细节。", "exploration", 30, "normal", ["popular", "creative", "fat-loss"]),

  quest("season-sunrise-30", "认真看一次清晨天空", "选择安全地点，在清晨观察天空变化，并留下一张照片或一句记录。", "exploration", 30, "normal", ["seasonal", "creative"]),
  quest("season-summer-walk-20", "完成一次傍晚清风散步", "避开高温时段，补充水分，在安全路线感受季节变化。", "fitness", 20, "normal", ["seasonal", "fat-loss"]),
  quest("season-cold-dish-25", "做一道清爽夏日料理", "选择适合自己的正常食谱，完成制作并认真享用。", "creation", 25, "normal", ["seasonal", "creative"]),
  quest("season-english-travel-15", "完成一段旅行英语演练", "模拟问路、点餐或入住场景，完整说出一轮对话。", "learning", 15, "normal", ["seasonal", "english"]),
  quest("season-night-market-30", "探索一次附近夜间生活", "和可信伙伴或在安全环境中，观察一个夜市、街区或公共空间。", "exploration", 30, "normal", ["seasonal", "popular"]),
  quest("season-friend-photo-20", "为朋友拍一组夏日照片", "征得同意后认真拍摄，选出一张并把它送给对方。", "social", 20, "normal", ["seasonal", "creative"]),
];

export const RESTART_QUESTS: Quest[] = [
  quest("restart-learning", "五分钟理解", "打开一页真正需要理解的资料，写下一个问题。", "learning", 5),
  quest("restart-fitness", "五分钟活动", "确认身体没有明显不适，在安全空间轻柔活动。", "fitness", 5),
  quest("restart-creation", "五分钟落笔", "打开作品，留下第一句、第一笔或第一个改动。", "creation", 5),
  quest("restart-discipline", "五分钟归位", "只整理一个小区域，先移走一件无用物品。", "discipline", 5),
  quest("restart-social", "五分钟回应", "选择一条需要回应的信息，写清事实与真实想法。", "social", 5),
  quest("restart-exploration", "五分钟求证", "选定一个现实问题，从官方或可靠来源开始查证。", "exploration", 5),
];

export type RecoveryAction = {
  id: string;
  title: string;
  objective: string;
  detail: string;
  minutes: number;
  mark: string;
};

export const RECOVERY_ACTIONS: RecoveryAction[] = [
  {
    id: "hydrate",
    title: "补水停靠",
    objective: "离开当前任务，慢慢喝一杯水",
    detail: "借这个动作检查自己是否已经连续坐了太久。",
    minutes: 2,
    mark: "水",
  },
  {
    id: "eye-rest",
    title: "远眺结界",
    objective: "放下屏幕，看向远处并活动眼睛",
    detail: "把视线交给窗外、天空或房间最远的位置。",
    minutes: 3,
    mark: "望",
  },
  {
    id: "mobility",
    title: "舒展仪式",
    objective: "活动肩颈、手腕、髋部与双腿",
    detail: "动作保持轻柔，不追求疼痛和幅度。",
    minutes: 5,
    mark: "展",
  },
  {
    id: "walk",
    title: "清醒巡游",
    objective: "离开座位，轻松步行一小段",
    detail: "不要求速度和里程，让注意力与身体换一次场景。",
    minutes: 10,
    mark: "行",
  },
  {
    id: "nourish",
    title: "生命补给",
    objective: "认真进食，不一边工作一边应付",
    detail: "选择适合自己的正常餐食或加餐。",
    minutes: 15,
    mark: "养",
  },
  {
    id: "sleep-ritual",
    title: "睡眠准备",
    objective: "降低光线和刺激，为睡眠收尾",
    detail: "整理明天的第一步，然后让今天在这里结束。",
    minutes: 10,
    mark: "息",
  },
];

export const DEFAULT_REAL_REWARDS: RealReward[] = [
  {
    id: "reward-playlist-walk",
    name: "戴上耳机听完一张喜欢的专辑",
    description: "不刷信息，只和音乐完整待一会。",
    mark: "声",
    pointCost: 25,
    weeklyLimit: 2,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-favorite-drink",
    name: "认真享用一杯喜欢的饮品",
    description: "放下任务，完整感受这段休息。",
    mark: "饮",
    pointCost: 35,
    weeklyLimit: 2,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-power-nap",
    name: "二十分钟安心小睡",
    description: "设好闹钟，让恢复也成为值得兑现的奖励。",
    mark: "眠",
    pointCost: 45,
    weeklyLimit: 2,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-game-hour",
    name: "一小时无负担游戏时间",
    description: "这是行动换来的娱乐，不需要内疚。",
    mark: "玩",
    pointCost: 60,
    weeklyLimit: 2,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-mystery-snack",
    name: "尝试一种没吃过的小食",
    description: "在正常饮食与预算内，给味觉一次小冒险。",
    mark: "尝",
    pointCost: 65,
    weeklyLimit: 1,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-cafe-hour",
    name: "去一家想去的店坐一小时",
    description: "可以发呆、看书或观察生活，不带工作任务。",
    mark: "憩",
    pointCost: 75,
    weeklyLimit: 1,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-movie",
    name: "看一部真正想看的电影",
    description: "给自己一段完整、不被打扰的体验。",
    mark: "映",
    pointCost: 90,
    weeklyLimit: 1,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-small-gift",
    name: "送自己一件预算内的小礼物",
    description: "选择真正喜欢或长期有用的东西，不冲动透支。",
    mark: "礼",
    pointCost: 130,
    weeklyLimit: 1,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-friend-date",
    name: "请喜欢的人一起吃顿好吃的",
    description: "把成长兑换成一段真诚、松弛的相处。",
    mark: "聚",
    pointCost: 150,
    weeklyLimit: 1,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-small-trip",
    name: "安排一次附近的小探索",
    description: "去一个想去但一直没有出发的地方。",
    mark: "游",
    pointCost: 180,
    weeklyLimit: 1,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "reward-offline-halfday",
    name: "半天离线自由日",
    description: "提前处理必要联系，然后把半天交还给真实世界。",
    mark: "隐",
    pointCost: 220,
    weeklyLimit: 1,
    isCustom: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const nodeSet = (
  domain: Domain,
  items: Array<Omit<GrowthNode, "id" | "domain">>,
): GrowthNode[] =>
  items.map((item, index) => ({
    ...item,
    domain,
    id: `${domain}-node-${index + 1}`,
  }));

export const GROWTH_NODES: GrowthNode[] = [
  ...nodeSet("learning", [
    { title: "翻开第一页", description: "完成第一次学习任务", requirementType: "completionCount", requirementValue: 1 },
    { title: "知识微光", description: "累计学习 60 分钟", requirementType: "totalMinutes", requirementValue: 60 },
    { title: "渐成体系", description: "完成 5 次学习任务", requirementType: "completionCount", requirementValue: 5 },
    { title: "写给未来", description: "留下一次学习记录", requirementType: "manualRecord", requirementValue: 1 },
    { title: "越过难关", description: "完成一次学习挑战", requirementType: "challengeCount", requirementValue: 1 },
  ]),
  ...nodeSet("fitness", [
    { title: "身体苏醒", description: "完成第一次运动任务", requirementType: "completionCount", requirementValue: 1 },
    { title: "稳定呼吸", description: "累计运动 60 分钟", requirementType: "totalMinutes", requirementValue: 60 },
    { title: "形成力量", description: "完成 5 次运动任务", requirementType: "completionCount", requirementValue: 5 },
    { title: "记住此刻", description: "留下一次运动记录", requirementType: "manualRecord", requirementValue: 1 },
    { title: "突破边界", description: "完成一次运动挑战", requirementType: "challengeCount", requirementValue: 1 },
  ]),
  ...nodeSet("creation", [
    { title: "第一笔", description: "完成第一次创作任务", requirementType: "completionCount", requirementValue: 1 },
    { title: "灵感成形", description: "累计创作 60 分钟", requirementType: "totalMinutes", requirementValue: 60 },
    { title: "持续输出", description: "完成 5 次创作任务", requirementType: "completionCount", requirementValue: 5 },
    { title: "作品注脚", description: "留下一次创作记录", requirementType: "manualRecord", requirementValue: 1 },
    { title: "公开表达", description: "完成一次创作挑战", requirementType: "challengeCount", requirementValue: 1 },
  ]),
  ...nodeSet("discipline", [
    { title: "一次选择", description: "完成第一次自律任务", requirementType: "completionCount", requirementValue: 1 },
    { title: "秩序初现", description: "累计自律 60 分钟", requirementType: "totalMinutes", requirementValue: 60 },
    { title: "行动有痕", description: "完成 5 次自律任务", requirementType: "completionCount", requirementValue: 5 },
    { title: "自我约定", description: "留下一次自律记录", requirementType: "manualRecord", requirementValue: 1 },
    { title: "守住承诺", description: "完成一次自律挑战", requirementType: "challengeCount", requirementValue: 1 },
  ]),
  ...nodeSet("social", [
    { title: "真诚开口", description: "完成第一次社交任务", requirementType: "completionCount", requirementValue: 1 },
    { title: "彼此看见", description: "累计社交 60 分钟", requirementType: "totalMinutes", requirementValue: 60 },
    { title: "建立连接", description: "完成 5 次社交任务", requirementType: "completionCount", requirementValue: 5 },
    { title: "同行片段", description: "留下一次社交记录", requirementType: "manualRecord", requirementValue: 1 },
    { title: "走近一步", description: "完成一次社交挑战", requirementType: "challengeCount", requirementValue: 1 },
  ]),
  ...nodeSet("exploration", [
    { title: "迈出边界", description: "完成第一次探索任务", requirementType: "completionCount", requirementValue: 1 },
    { title: "世界展开", description: "累计探索 60 分钟", requirementType: "totalMinutes", requirementValue: 60 },
    { title: "发现路径", description: "完成 5 次探索任务", requirementType: "completionCount", requirementValue: 5 },
    { title: "旅途坐标", description: "留下一次探索记录", requirementType: "manualRecord", requirementValue: 1 },
    { title: "抵达未知", description: "完成一次探索挑战", requirementType: "challengeCount", requirementValue: 1 },
  ]),
];
