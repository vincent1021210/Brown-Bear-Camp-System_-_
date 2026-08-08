import type {
  Attempt,
  AttemptStatus,
  CheckInResult,
  Station,
  Team,
} from "./types";

const EVENT_ID = "event-brown-bear-2026-main";

function getGasUrl(): string {
  const url = process.env.GAS_WEB_APP_URL;
  if (!url) {
    throw new Error(
      "缺少 GAS_WEB_APP_URL。請在 .env.local 設定 Google Apps Script 網頁應用程式網址。",
    );
  }
  return url.replace(/\/$/, "");
}

/**
 * Apps Script /exec 會 302 導向 googleusercontent。
 * 若自動 follow，POST 會變成 GET 而丟失 body，因此手動跟隨一次。
 */
async function gasFetch(init: {
  method: "GET" | "POST";
  action: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}): Promise<Response> {
  const url = new URL(getGasUrl());
  if (init.method === "GET") {
    url.searchParams.set("action", init.action);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      url.searchParams.set(key, value);
    }
  }

  const payload =
    init.method === "POST"
      ? JSON.stringify({ action: init.action, ...(init.body ?? {}) })
      : undefined;

  const headers: HeadersInit =
    init.method === "POST"
      ? { "Content-Type": "text/plain;charset=utf-8" }
      : {};

  const first = await fetch(url.toString(), {
    method: init.method,
    headers,
    body: payload,
    redirect: "manual",
    cache: "no-store",
  });

  if (first.status >= 300 && first.status < 400) {
    const location = first.headers.get("location");
    if (!location) {
      throw new Error("Apps Script 重新導向缺少 location");
    }
    return fetch(location, {
      method: init.method,
      headers,
      body: payload,
      redirect: "follow",
      cache: "no-store",
    });
  }

  return first;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Apps Script 回應不是 JSON：${text.slice(0, 200)}`);
  }
}

async function gasGet<T>(
  action: string,
  query: Record<string, string> = {},
): Promise<T> {
  const res = await gasFetch({ method: "GET", action, query });
  return parseJson<T>(res);
}

async function gasPost<T>(
  action: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const res = await gasFetch({ method: "POST", action, body });
  return parseJson<T>(res);
}

export async function listBootstrap() {
  return gasGet<{
    event: { id: string; name: string };
    teams: Team[];
    stations: Station[];
    gameMasters: Array<{ id: string; name: string; stationId: string }>;
  }>("bootstrap");
}

export async function getTeamProgress(teamId: string) {
  const data = await gasGet<{
    error?: string;
    event: { id: string; name: string };
    team: Team;
    progress: Array<{
      stationId: string;
      order: number;
      name: string;
      shortName: string;
      state: "pending" | "pass" | "fail";
    }>;
    judgedCount: number;
    passCount: number;
    totalStations: number;
  }>("team", { teamId });

  if (data.error) return null;
  return data;
}

export function parseTeamQr(raw: string) {
  try {
    const data = JSON.parse(raw) as {
      type: string;
      teamId: string;
      eventId: string;
    };
    if (data.type === "team" && data.teamId && data.eventId) {
      return {
        type: "team" as const,
        teamId: data.teamId,
        eventId: data.eventId,
      };
    }
    return null;
  } catch {
    const match = raw.match(/team-[\w-]+/);
    if (match) {
      return {
        type: "team" as const,
        teamId: match[0],
        eventId: EVENT_ID,
      };
    }
    return null;
  }
}

export async function checkInTeam(params: {
  teamId: string;
  stationId: string;
}): Promise<CheckInResult | { ok: false; reason: string }> {
  return gasPost("checkIn", params);
}

export async function verifyTreasureCode(params: {
  stationId: string;
  code: string;
}): Promise<{ ok: boolean; reason?: string }> {
  return gasPost("treasure", params);
}

export async function recordAttempt(params: {
  teamId: string;
  stationId: string;
  status: AttemptStatus;
  treasureCode?: string;
}): Promise<{ ok: true; attempt: Attempt } | { ok: false; reason: string }> {
  return gasPost("complete", params);
}

export async function lockStation(stationId: string) {
  return gasPost<{
    ok: boolean;
    reason?: string;
    station?: Station;
    gameMaster?: { id: string; name: string; stationId: string };
    event?: { id: string; name: string };
  }>("lock", { stationId });
}

export async function resetDb() {
  return gasPost<{ ok: boolean; teams?: number; stations?: number }>("reset");
}
