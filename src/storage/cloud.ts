import type { GameState } from "../domain/types";
import { normalizeGame, validateBackup } from "./db";

export type CloudLoadResult =
  | { status: "signed-out"; state: null; displayName?: string }
  | { status: "ready"; state: GameState | null; displayName?: string };

export const loadCloudGame = async (): Promise<CloudLoadResult> => {
  const response = await fetch("/api/sync", {
    method: "GET",
    cache: "no-store",
  });
  if (response.status === 401) {
    return { status: "signed-out", state: null };
  }
  if (!response.ok) throw new Error("cloud load failed");
  const payload = (await response.json()) as {
    state?: unknown;
    displayName?: string;
  };
  if (!payload.state) {
    return {
      status: "ready",
      state: null,
      displayName: payload.displayName,
    };
  }
  if (!validateBackup(payload.state)) throw new Error("invalid cloud save");
  return {
    status: "ready",
    state: normalizeGame(payload.state),
    displayName: payload.displayName,
  };
};

export const saveCloudGame = async (state: GameState) => {
  const response = await fetch("/api/sync", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      state,
      updatedAt: state.lastModifiedAt,
    }),
  });
  if (response.status === 401) return { status: "signed-out" as const };
  if (!response.ok) throw new Error("cloud save failed");
  return { status: "saved" as const };
};
