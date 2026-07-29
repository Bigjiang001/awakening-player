import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const playerSaves = sqliteTable("player_saves", {
  userEmail: text("user_email").primaryKey(),
  objectKey: text("object_key").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const companionLinks = sqliteTable("companion_links", {
  code: text("code").primaryKey(),
  ownerEmail: text("owner_email").notNull().unique(),
  partnerEmail: text("partner_email").unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  joinedAt: text("joined_at"),
});

export const communityQuests = sqliteTable(
  "community_quests",
  {
    id: text("id").primaryKey(),
    authorEmail: text("author_email").notNull(),
    sourceQuestId: text("source_quest_id").notNull(),
    authorNickname: text("author_nickname").notNull(),
    authorStage: text("author_stage").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    domain: text("domain").notNull(),
    plannedMinutes: integer("planned_minutes").notNull(),
    difficulty: text("difficulty").notNull(),
    adoptedCount: integer("adopted_count").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("community_quests_author_source_unique").on(
      table.authorEmail,
      table.sourceQuestId,
    ),
  ],
);

export const communityQuestAdoptions = sqliteTable(
  "community_quest_adoptions",
  {
    questId: text("quest_id")
      .notNull()
      .references(() => communityQuests.id),
    userEmail: text("user_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.questId, table.userEmail] })],
);

export const communityQuestCompletions = sqliteTable(
  "community_quest_completions",
  {
    questId: text("quest_id")
      .notNull()
      .references(() => communityQuests.id),
    userEmail: text("user_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.questId, table.userEmail] })],
);

export const communityQuestReports = sqliteTable(
  "community_quest_reports",
  {
    questId: text("quest_id")
      .notNull()
      .references(() => communityQuests.id),
    userEmail: text("user_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.questId, table.userEmail] })],
);
