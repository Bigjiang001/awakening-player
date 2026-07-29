# 觉醒玩家

把读书、运动、创作、自律、社交与探索，变成看得见的现实成长。

## GitHub Pages 手机本机版

该版本可以作为静态 PWA 发布到 GitHub Pages：

- 保留任务、计时、行动点、等级、成就、成长日历、现实奖励与数据备份。
- 玩家数据保存在当前浏览器的 IndexedDB 中，不上传任务、照片或私人记录。
- 云同步、同行邀请码和真实玩家广场将在连接独立后端后恢复。

### 本地运行

```bash
npm install
npm run dev:pages
```

### 构建

```bash
npm run build:pages
```

产物位于 `github-pages-dist/`。推送到 GitHub 的 `main` 分支后，仓库中的
GitHub Actions 工作流会自动构建并部署到 GitHub Pages。

## 完整云端版

原始 vinext/Cloudflare 构建仍保留，供未来连接独立后端时继续开发：

```bash
npm run dev
npm run build
```
