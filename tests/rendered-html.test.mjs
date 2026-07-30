import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const file = (path) => new URL(path, root);

test("ships an installable iPhone web app", async () => {
  const [manifestText, layout, serviceWorker] = await Promise.all([
    readFile(file("public/manifest.webmanifest"), "utf8"),
    readFile(file("app/layout.tsx"), "utf8"),
    readFile(file("public/service-worker.js"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.deepEqual(
    manifest.icons.map((icon) => icon.sizes),
    ["192x192", "512x512"],
  );
  assert.match(layout, /appleWebApp/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /apple-touch-icon\.png/);
  assert.match(serviceWorker, /new URL\("api\/", scopeUrl\)\.pathname/);
  assert.match(serviceWorker, /cache\.put\(scopeUrl, copy\)/);

  for (const icon of [
    "public/icon-192.png",
    "public/icon-512.png",
    "public/apple-touch-icon.png",
  ]) {
    await access(file(icon));
    assert.ok((await stat(file(icon))).size > 10_000);
  }
});

test("keeps the core real-world loop and iPhone install guidance", async () => {
  const [page, css, storage] = await Promise.all([
    readFile(file("app/page.tsx"), "utf8"),
    readFile(file("app/globals.css"), "utf8"),
    readFile(file("src/storage/db.ts"), "utf8"),
  ]);

  assert.match(page, /我确认现实目标确实发生了/);
  assert.match(page, /把觉醒玩家变成 App/);
  assert.match(page, /添加到主屏幕/);
  assert.match(page, /communitySourceId/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-height:\s*2\.75rem/);
  assert.match(storage, /memory\.questTitle !== catalogQuest\.title/);
});

test("provides a moderated shared-task community", async () => {
  const [component, route, migration] = await Promise.all([
    readFile(file("src/components/community-quest-hub.tsx"), "utf8"),
    readFile(file("app/api/community/route.ts"), "utf8"),
    readFile(file("drizzle/0001_curly_legion.sql"), "utf8"),
  ]);

  assert.match(component, /加入我的任务/);
  assert.match(component, /共同完成/);
  assert.match(component, /成长阶段/);
  assert.match(route, /daily publish limit reached/);
  assert.match(route, /community_quest_reports/);
  assert.match(route, /status = 'review'/);
  assert.match(migration, /CREATE TABLE `community_quests`/);
  assert.match(migration, /觉醒策展人/);
});

test("ships richer real-world quests, rewards, and a phone-safe calendar", async () => {
  const [page, catalog, css] = await Promise.all([
    readFile(file("app/page.tsx"), "utf8"),
    readFile(file("src/data/game-data.ts"), "utf8"),
    readFile(file("app/globals.css"), "utf8"),
  ]);

  assert.doesNotMatch(page, /年轻人热门/);
  assert.match(page, /label:\s*"热门"/);
  assert.match(catalog, /核实三条 AI 给出的答案/);
  assert.match(catalog, /参加一次线下兴趣活动/);
  assert.match(catalog, /做一个能被使用的小工具/);
  assert.match(catalog, /完成一次英文实时交流/);
  assert.match(catalog, /制作一枚现实成长纪念物/);
  assert.match(page, /今日奖励签/);
  assert.match(page, /换签不扣行动点/);
  assert.match(css, /grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.action-calendar[\s\S]*?max-width:\s*100%/);
});

test("keeps task launch simple and lets real completion beat the clock", async () => {
  const [page, rules, types, storage, css] = await Promise.all([
    readFile(file("app/page.tsx"), "utf8"),
    readFile(file("src/domain/rules.ts"), "utf8"),
    readFile(file("src/domain/types.ts"), "utf8"),
    readFile(file("src/storage/db.ts"), "utf8"),
    readFile(file("app/globals.css"), "utf8"),
  ]);

  assert.doesNotMatch(page, /行动触发器/);
  assert.doesNotMatch(page, /把下一次行动加入系统日历/);
  assert.doesNotMatch(types, /ActionTrigger/);
  assert.doesNotMatch(storage, /actionTriggers:\s*\[\]/);
  assert.match(storage, /delete stateWithoutLegacyTriggers\.actionTriggers/);
  assert.doesNotMatch(css, /\.trigger-plan/);
  assert.match(page, /value=\{minutesInput\}/);
  assert.match(page, /setMinutesInput\(event\.target\.value\)/);
  assert.match(page, /可以先完全清空再输入 1–180 分钟/);
  assert.match(page, /已完成，记录成果/);
  assert.match(page, /即使还没到参考时间，也可以现在记录/);
  assert.match(types, /timingMode\?:\s*"timed"\s*\|\s*"result"/);
  assert.match(rules, /session\.status === "active"/);
  assert.match(rules, /quest\.domain === "learning"/);
  assert.match(rules, /quest\.domain === "fitness"/);
  assert.match(page, /"timed"\s*:\s*"result"/);
});

test("builds a GitHub Pages local-first phone edition", async () => {
  const [sourceHtml, renderedHtml, page, workflow, config] = await Promise.all([
    readFile(file("github-pages/index.html"), "utf8"),
    readFile(file("github-pages-dist/index.html"), "utf8"),
    readFile(file("app/page.tsx"), "utf8"),
    readFile(file(".github/workflows/pages.yml"), "utf8"),
    readFile(file("vite.github-pages.config.ts"), "utf8"),
  ]);

  assert.match(sourceHtml, /data-host-mode="local"/);
  assert.match(sourceHtml, /href="\.\/manifest\.webmanifest"/);
  assert.match(renderedHtml, /src="\.\/assets\//);
  assert.match(renderedHtml, /href="\.\/assets\//);
  assert.match(page, /手机本地存档已开启/);
  assert.match(page, /GitHub 本机版 V3\.1/);
  assert.match(page, /if \(localOnly\) return false/);
  assert.doesNotMatch(page, /此刻行动推荐/);
  assert.doesNotMatch(page, /告诉我你现在的状态/);
  assert.match(page, /home-quest-swiper/);
  assert.match(page, /onPointerDown=\{rememberSwipeStart\}/);
  assert.match(page, /向右滑换一个/);
  assert.match(page, /day\.count > 9 \? "9\+" : day\.count/);
  assert.match(config, /base:\s*"\.\/"/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
