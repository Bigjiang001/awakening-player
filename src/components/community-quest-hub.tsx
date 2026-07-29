"use client";

import { useEffect, useMemo, useState } from "react";
import { DOMAIN_META } from "../data/game-data";
import type { CommunityQuest, GameState } from "../domain/types";

export function CommunityQuestHub({
  state,
  refreshKey,
  onAdopt,
}: {
  state: GameState;
  refreshKey: number;
  onAdopt: (quest: CommunityQuest) => void;
}) {
  const [quests, setQuests] = useState<CommunityQuest[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const adoptedIds = useMemo(
    () =>
      new Set(
        state.quests
          .map((quest) => quest.communitySourceId)
          .filter((id): id is string => Boolean(id)),
      ),
    [state.quests],
  );

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/community", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("community unavailable");
        return (await response.json()) as { quests?: CommunityQuest[] };
      })
      .then((payload) => {
        if (cancelled) return;
        setQuests(payload.quests ?? []);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const report = async (quest: CommunityQuest) => {
    if (!window.confirm(`确认举报「${quest.title}」吗？仅用于不安全、违法或冒犯内容。`)) return;
    const response = await fetch("/api/community", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: quest.id, action: "report" }),
    }).catch(() => null);
    setMessage(response?.ok ? "已收到举报，会进入审核。" : "暂时无法提交，请稍后再试。");
  };

  const totalPeers = quests.reduce(
    (sum, quest) => sum + quest.completedCount,
    0,
  );

  return (
    <section className="community-hub">
      <div className="community-hero">
        <div>
          <p>同行任务广场</p>
          <h2>看见有人和你走在同一条路上</h2>
          <span>只共享任务与成长阶段，不展示真实姓名、照片和私人记录。</span>
        </div>
        <div className="community-hero__signal">
          <strong>{totalPeers}</strong>
          <small>共同完成</small>
        </div>
      </div>

      {status === "loading" && (
        <div className="community-state"><span>寻</span><p>正在寻找同路人的任务…</p></div>
      )}
      {status === "error" && (
        <div className="community-state"><span>雾</span><p>同行广场暂时没有连上，自己的任务仍可正常使用。</p></div>
      )}
      {status === "ready" && quests.length === 0 && (
        <div className="community-state"><span>火</span><p>你可能是第一位发布者。创建自定义任务时，可以选择公开到这里。</p></div>
      )}
      {status === "ready" && quests.length > 0 && (
        <div className="community-list">
          {quests.map((quest) => {
            const meta = DOMAIN_META[quest.domain];
            const adopted = adoptedIds.has(quest.id);
            return (
              <article className={`community-quest domain-${quest.domain}`} key={quest.id}>
                <div className="community-quest__author">
                  <span>{quest.authorNickname.slice(0, 1)}</span>
                  <div><strong>{quest.authorNickname}</strong><small>{quest.authorStage} · {meta.name}</small></div>
                  <button type="button" onClick={() => void report(quest)}>举报</button>
                </div>
                <h3>{quest.title}</h3>
                <p>{quest.description}</p>
                <div className="community-quest__stats">
                  <span>◷ {quest.plannedMinutes} 分钟</span>
                  <span>{quest.adoptedCount} 人加入</span>
                  <span>{quest.completedCount} 人完成</span>
                </div>
                <button
                  className="community-adopt"
                  type="button"
                  disabled={adopted}
                  onClick={() => onAdopt(quest)}
                >
                  {adopted ? "已在我的任务中" : "加入我的任务"}
                </button>
              </article>
            );
          })}
        </div>
      )}
      {message && <p className="community-message" role="status">{message}</p>}
      <p className="gentle-rule">优秀任务来自真实经验；请始终优先选择安全、合法、尊重自己和他人的行动。</p>
    </section>
  );
}
