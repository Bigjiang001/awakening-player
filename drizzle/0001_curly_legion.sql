CREATE TABLE `community_quest_adoptions` (
	`quest_id` text NOT NULL,
	`user_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`quest_id`, `user_email`),
	FOREIGN KEY (`quest_id`) REFERENCES `community_quests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `community_quest_completions` (
	`quest_id` text NOT NULL,
	`user_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`quest_id`, `user_email`),
	FOREIGN KEY (`quest_id`) REFERENCES `community_quests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `community_quest_reports` (
	`quest_id` text NOT NULL,
	`user_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`quest_id`, `user_email`),
	FOREIGN KEY (`quest_id`) REFERENCES `community_quests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `community_quests` (
	`id` text PRIMARY KEY NOT NULL,
	`author_email` text NOT NULL,
	`source_quest_id` text NOT NULL,
	`author_nickname` text NOT NULL,
	`author_stage` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`domain` text NOT NULL,
	`planned_minutes` integer NOT NULL,
	`difficulty` text NOT NULL,
	`adopted_count` integer DEFAULT 0 NOT NULL,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_quests_author_source_unique` ON `community_quests` (`author_email`,`source_quest_id`);
--> statement-breakpoint
INSERT INTO `community_quests` (
  `id`, `author_email`, `source_quest_id`, `author_nickname`, `author_stage`,
  `title`, `description`, `domain`, `planned_minutes`, `difficulty`
) VALUES
  ('seed-walk-new-route', 'system', 'seed-walk-new-route', '觉醒策展人', '世界搭建者',
   '戴上耳机走一条陌生路线', '选一张喜欢的歌单，走一条安全但平常不会选择的路线，回来记下一个新发现。', 'exploration', 25, 'normal'),
  ('seed-english-life', 'system', 'seed-english-life', '觉醒策展人', '世界搭建者',
   '把今天用英语讲给未来的自己', '不用写稿，录一段只给自己听的英文语音。允许停顿，但完整说完今天发生的事。', 'learning', 12, 'challenge'),
  ('seed-fear-message', 'system', 'seed-fear-message', '觉醒策展人', '世界搭建者',
   '发出那条想发却一直没发的消息', '选择安全、尊重边界的对象，把真诚而具体的话说出去，不要求对方立刻回应。', 'social', 10, 'challenge'),
  ('seed-room-reset', 'system', 'seed-room-reset', '觉醒策展人', '世界搭建者',
   '让房间出现一平方米的秩序', '只整理眼前一平方米，不追求一次收完。完成后拍下这个重新可用的小空间。', 'discipline', 15, 'normal'),
  ('seed-body-date', 'system', 'seed-body-date', '觉醒策展人', '世界搭建者',
   '和身体约一次不看数据的运动', '不看消耗和排名，选择一种舒服的运动，只感受呼吸、力量与身体反馈。', 'fitness', 20, 'normal'),
  ('seed-one-hour-work', 'system', 'seed-one-hour-work', '觉醒策展人', '世界搭建者',
   '完成一个可以被别人看见的小作品', '把一个想法做到可展示的程度，允许不完美；结束时导出、拍照或发给可信的人。', 'creation', 45, 'challenge');
