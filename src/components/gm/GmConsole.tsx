"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { QrScanner } from "./QrScanner";
import {
  checkInTeam,
  listBootstrap,
  lockStation,
  parseTeamQr,
  recordAttempt,
  undoAttempt,
} from "@/lib/client-db";
import type { Station } from "@/lib/types";

type Step = "lock" | "scan" | "team" | "done";

interface TeamInfo {
  id: string;
  name: string;
  emblem: string;
}

const GM_PASSWORD = "@abc12345";
const GM_UNLOCK_KEY = "gmUnlocked";

export function GmConsole() {
  const [unlocked, setUnlocked] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("lock");
  const [station, setStation] = useState<Station | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [canJudge, setCanJudge] = useState(true);
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualTeamId, setManualTeamId] = useState("");

  useEffect(() => {
    const ok = sessionStorage.getItem(GM_UNLOCK_KEY) === "1";
    if (ok) {
      sessionStorage.setItem("role", "gm");
      setUnlocked(true);
    } else {
      sessionStorage.removeItem("role");
    }
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!unlocked) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void listBootstrap()
      .then((data) => setStations(data.stations ?? []))
      .finally(() => setLoading(false));
  }, [unlocked]);

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (password !== GM_PASSWORD) {
      setPasswordError("密碼錯誤，請再試一次");
      return;
    }
    sessionStorage.setItem(GM_UNLOCK_KEY, "1");
    sessionStorage.setItem("role", "gm");
    setPassword("");
    setPasswordError("");
    setUnlocked(true);
  }

  function clearGmSession() {
    sessionStorage.removeItem("role");
    sessionStorage.removeItem(GM_UNLOCK_KEY);
  }

  async function handleLock(stationId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const data = await lockStation(stationId);
      if (!data.ok || !data.station) {
        setMessage(data.reason ?? "鎖定失敗");
        return;
      }
      setStation(data.station);
      setStep("scan");
    } finally {
      setBusy(false);
    }
  }

  const runCheckIn = useCallback(
    async (payload: { qrPayload?: string; teamId?: string }) => {
      if (!station) return;
      setBusy(true);
      setMessage(null);
      try {
        let teamId = payload.teamId;
        if (!teamId && payload.qrPayload) {
          const parsed = parseTeamQr(payload.qrPayload);
          if (!parsed) {
            setMessage("無法辨識小隊 QR");
            setStep("scan");
            return;
          }
          teamId = parsed.teamId;
        }
        if (!teamId) {
          setMessage("缺少小隊資訊");
          return;
        }

        const data = await checkInTeam({ teamId, stationId: station.id });
        if (!data.ok) {
          setMessage(data.reason ?? "掃描失敗");
          setStep("scan");
          return;
        }

        setTeam({
          id: data.team.id,
          name: data.team.name,
          emblem: data.team.emblem,
        });
        setCanJudge(data.canJudge);
        setReason(data.reason ?? null);
        setStep("team");
      } finally {
        setBusy(false);
      }
    },
    [station],
  );

  const onScan = useCallback(
    (text: string) => {
      void runCheckIn({ qrPayload: text });
    },
    [runCheckIn],
  );

  async function submit(status: "pass" | "fail") {
    if (!team || !station) return;

    setBusy(true);
    setMessage(null);
    try {
      const data = await recordAttempt({
        teamId: team.id,
        stationId: station.id,
        status,
      });
      if (!data.ok) {
        setMessage(data.reason ?? "送出失敗");
        return;
      }
      setMessage(status === "pass" ? "已登錄：通過" : "已登錄：不通過");
      setStep("done");
    } finally {
      setBusy(false);
    }
  }

  function resetToScan() {
    setTeam(null);
    setCanJudge(true);
    setReason(null);
    setMessage(null);
    setManualTeamId("");
    setStep("scan");
  }

  async function revertToIncomplete() {
    if (!team || !station) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await undoAttempt({
        teamId: team.id,
        stationId: station.id,
      });
      if (!data.ok) {
        setMessage(data.reason ?? "回復失敗");
        return;
      }
      setCanJudge(true);
      setReason(null);
      setMessage("已回復為未完成，可重新判定");
      setStep("team");
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1931] text-[#9bb6d4]">
        載入中…
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="gm-screen mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-6">
        <header className="mb-6 text-center">
          <div className="mb-3 flex justify-start">
            <Link href="/" className="text-sm text-[#9bb6d4]">
              ← 返回選擇身分
            </Link>
          </div>
          <p className="text-xs tracking-[0.3em] text-[#9bb6d4]">GAME MASTER</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#f0c674]">關主密碼</h1>
          <p className="mt-2 text-sm text-[#9bb6d4]">請輸入密碼後進入關主畫面</p>
        </header>

        <form
          onSubmit={submitPassword}
          className="rounded-3xl border-2 border-[#f0c674]/70 bg-[#0d2244]/90 p-6"
        >
          <label htmlFor="gm-console-password" className="block text-sm text-[#b8cce0]">
            密碼
          </label>
          <input
            id="gm-console-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError("");
            }}
            className="mt-2 w-full rounded-xl border border-[#f0c674]/40 bg-[#071428] px-4 py-3 text-base text-white outline-none ring-[#f0c674] placeholder:text-[#6f87a3] focus:border-[#f0c674] focus:ring-1"
            placeholder="請輸入關主密碼"
          />
          {passwordError && (
            <p className="mt-3 text-sm text-[#ff8f8f]" role="alert">
              {passwordError}
            </p>
          )}
          <button
            type="submit"
            className="mt-5 w-full rounded-2xl bg-[#f0c674] px-4 py-3 text-base font-semibold text-[#0a1931] transition hover:bg-[#f6d48a] active:scale-[0.99]"
          >
            進入關主畫面
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1931] text-[#9bb6d4]">
        載入中…
      </div>
    );
  }

  return (
    <div className="gm-screen mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-6">
      <header className="mb-6 text-center">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            onClick={clearGmSession}
            className="text-sm text-[#9bb6d4]"
          >
            ← 返回選擇身分
          </Link>
          <Link
            href="/gm/board/"
            className="rounded-full border border-[#f0c674]/45 px-3 py-1.5 text-sm text-[#f0c674] transition hover:border-[#f0c674] hover:bg-[#f0c674]/10"
          >
            每小隊統計圖
          </Link>
        </div>
        <p className="text-xs tracking-[0.3em] text-[#9bb6d4]">任務完成判定</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#f0c674]">關主畫面</h1>
        {station && (
          <p className="mt-2 text-sm text-[#d7e6f7]">
            已鎖定：第{station.order}關_{station.shortName || station.name}
          </p>
        )}
      </header>

      {step === "lock" && (
        <section className="flex flex-1 flex-col gap-3">
          <ul className="mb-2 space-y-2 rounded-2xl border border-[#f0c674]/35 bg-[#0d2244]/70 p-4 text-sm leading-relaxed text-[#d7e6f7]">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0c674]" />
              關主先鎖定當前關卡 stationId。
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0c674]" />
              小隊完成任務後，關主掃描小隊 QR。
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0c674]" />
              系統以 eventId + teamId + stationId 判斷唯一完成紀錄。
            </li>
          </ul>
          {stations.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => void handleLock(s.id)}
              className="rounded-xl border border-[#f0c674]/55 bg-[#0d2244]/80 px-4 py-3.5 text-left transition hover:border-[#f0c674] hover:bg-[#12315a] disabled:opacity-50"
            >
              <span className="text-[#f0c674]">第{s.order}關</span>
              <span className="mt-0.5 block text-sm text-[#d7e6f7]">{s.name}</span>
            </button>
          ))}
          {message && <p className="text-center text-sm text-[#ffb4b4]">{message}</p>}
        </section>
      )}

      {step === "scan" && station && (
        <section className="flex flex-1 flex-col gap-4">
          <div className="rounded-2xl border border-[#f0c674]/35 bg-[#0d2244]/70 p-4 text-center">
            <p className="text-sm text-[#d7e6f7]">掃描小隊 QR Code 後進入小隊專屬頁面</p>
          </div>
          <QrScanner key={`scan-${station.id}`} onScan={onScan} />
          {message && <p className="text-center text-sm text-[#ffb4b4]">{message}</p>}

          <div className="rounded-2xl border border-[#f0c674]/30 bg-[#0d2244]/60 p-4">
            <p className="mb-2 text-xs text-[#9bb6d4]">無法掃描時可手動輸入小隊 ID</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-[#f0c674]/40 bg-[#071428] px-3 py-2.5 text-sm text-white"
                placeholder="例如 黑 或 team-01"
                value={manualTeamId}
                onChange={(e) => setManualTeamId(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !manualTeamId}
                onClick={() => void runCheckIn({ teamId: manualTeamId.trim() })}
                className="rounded-xl border border-[#f0c674] px-3 py-2 text-sm text-[#f0c674] disabled:opacity-50"
              >
                確認
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setStation(null);
              setStep("lock");
            }}
            className="rounded-xl border border-[#f0c674]/40 px-4 py-3 text-[#d7e6f7]"
          >
            重新選擇關卡
          </button>
        </section>
      )}

      {step === "team" && team && station && (
        <section className="flex flex-1 flex-col gap-4">
          <div className="rounded-2xl border border-[#f0c674]/50 bg-[#0d2244]/85 p-6 text-center">
            <p className="text-xs tracking-[0.25em] text-[#9bb6d4]">小隊專屬頁面</p>
            <h2 className="mt-3 text-3xl font-bold text-[#f0c674]">
              {team.emblem}・{team.name}
            </h2>
            <p className="mt-3 text-sm text-[#d7e6f7]">
              第{station.order}關_{station.shortName || station.name}
            </p>
            {!canJudge && (
              <p className="mt-4 rounded-xl border border-[#f0c674]/40 bg-[#f0c674]/10 px-3 py-2 text-sm text-[#ffe7a8]">
                {reason ?? "已完成，不重複計算"}
              </p>
            )}
          </div>

          {canJudge ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit("fail")}
                className="rounded-xl border border-[#f0c674]/55 bg-[#2a1520] px-4 py-4 text-lg font-semibold text-[#ffb4b4] disabled:opacity-50"
              >
                不通過
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit("pass")}
                className="rounded-xl bg-[#f0c674] px-4 py-4 text-lg font-semibold text-[#1a1205] disabled:opacity-50"
              >
                通過
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void revertToIncomplete()}
                className="rounded-xl border border-[#f0c674]/55 bg-[#2a1520] px-4 py-3.5 font-semibold text-[#ffb4b4] disabled:opacity-50"
              >
                未完成
              </button>
              <button
                type="button"
                onClick={resetToScan}
                className="rounded-xl bg-[#f0c674] px-4 py-3.5 font-semibold text-[#1a1205]"
              >
                掃描下一隊
              </button>
            </div>
          )}

          {message && <p className="text-center text-sm text-[#ffb4b4]">{message}</p>}

          <button
            type="button"
            onClick={resetToScan}
            className="rounded-xl border border-[#f0c674]/35 px-4 py-3 text-[#d7e6f7]"
          >
            取消，重新掃描
          </button>
        </section>
      )}

      {step === "done" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="w-full rounded-2xl border border-[#f0c674]/45 bg-[#0d2244]/85 px-6 py-8">
            <h2 className="text-2xl font-semibold text-[#f0c674]">判定完成</h2>
            <p className="mt-3 text-sm text-[#d7e6f7]">{message}</p>
            <p className="mt-2 text-sm text-[#9bb6d4]">
              {team?.name}｜第{station?.order}關
            </p>
            <ul className="mt-5 space-y-2 text-left text-xs leading-relaxed text-[#9bb6d4]">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0c674]" />
                未完成過：新增紀錄，點亮關卡格
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0c674]" />
                已完成過：顯示「已完成，不重複計算」
              </li>
            </ul>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void revertToIncomplete()}
            className="w-full rounded-xl border border-[#f0c674]/55 bg-[#2a1520] px-4 py-3.5 font-semibold text-[#ffb4b4] disabled:opacity-50"
          >
            未完成
          </button>
          <button
            type="button"
            onClick={resetToScan}
            className="w-full rounded-xl bg-[#f0c674] px-4 py-3.5 font-semibold text-[#1a1205]"
          >
            掃描下一隊
          </button>
        </section>
      )}
    </div>
  );
}
