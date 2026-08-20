"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listBoardProgress, type BoardData } from "@/lib/client-db";
import type { StationPlayState } from "@/lib/types";

const STATION_COLORS = [
  "#3B82F6",
  "#22C55E",
  "#EAB308",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#B91C1C",
  "#8B5CF6",
] as const;

const POLL_MS = 2500;

function formatUpdatedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString("zh-TW", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function cellClass(state: StationPlayState, color: string) {
  if (state === "pass") {
    return {
      className:
        "h-9 min-w-9 flex-1 rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.08)]",
      style: { backgroundColor: color } as CSSProperties,
      title: "通過",
    };
  }
  if (state === "fail") {
    return {
      className:
        "h-9 min-w-9 flex-1 rounded-lg border-2 bg-transparent opacity-90",
      style: { borderColor: color } as CSSProperties,
      title: "不通過",
    };
  }
  return {
    className: "h-9 min-w-9 flex-1 rounded-lg bg-[#3a4558]",
    style: undefined as CSSProperties | undefined,
    title: "未完成",
  };
}

export function TeamBoardClient() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlocked = sessionStorage.getItem("gmUnlocked") === "1";
    if (!unlocked) {
      router.replace("/gm");
      return;
    }
    sessionStorage.setItem("role", "gm");
    setAllowed(true);
  }, [router]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;

    async function load() {
      try {
        const board = await listBoardProgress();
        if (cancelled) return;
        setData(board);
        setError(null);
      } catch {
        if (!cancelled) setError("載入看板失敗");
      }
    }

    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1931] text-[#9bb6d4]">
        請先進入關主…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1931] text-[#ffb4b4]">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1931] text-[#9bb6d4]">
        載入統計圖…
      </div>
    );
  }

  const stationCount = data.stations.length || 8;
  const teamCount = data.rows.length || 6;

  return (
    <div className="board-screen min-h-dvh bg-[radial-gradient(ellipse_at_top,#13284a_0%,#070f1c_55%,#050a14_100%)] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/gm/" className="text-sm text-[#9bb6d4]">
            ← 返回關主畫面
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              實時更新中…
            </span>
            <span className="text-[#9bb6d4]">
              最後更新：{formatUpdatedAt(data.updatedAt)}
            </span>
          </div>
        </div>

        <header className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            活動闖關進度實時看板
            <span className="mt-1 block text-base font-medium text-[#9bb6d4] sm:mt-0 sm:ml-2 sm:inline">
              （{teamCount} 小隊 × {stationCount} 關卡）
            </span>
          </h1>
          <p className="mt-2 text-sm text-[#b8cce0]">{data.event.name}</p>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0c1729]/75 p-3 sm:p-5">
          <div
            className="mb-3 grid min-w-[720px] items-center gap-2 text-center text-xs text-[#9bb6d4] sm:text-sm"
            style={{
              gridTemplateColumns: `7.5rem repeat(${stationCount}, minmax(2.25rem, 1fr)) 4.5rem 5rem`,
            }}
          >
            <div className="text-left">小隊</div>
            {data.stations.map((station) => (
              <div key={station.id} title={station.name}>
                關卡 {station.order}
              </div>
            ))}
            <div>目前排行</div>
            <div>總通關率</div>
          </div>

          <div className="min-w-[720px] space-y-2.5">
            {data.rows.map((row) => (
              <div
                key={row.team.id}
                className="grid items-center gap-2"
                style={{
                  gridTemplateColumns: `7.5rem repeat(${stationCount}, minmax(2.25rem, 1fr)) 4.5rem 5rem`,
                }}
              >
                <div className="truncate text-left text-sm font-medium text-[#e8eef7]">
                  {row.team.emblem}小隊
                </div>
                {row.progress.map((cell, idx) => {
                  const color =
                    STATION_COLORS[idx % STATION_COLORS.length] ?? "#3B82F6";
                  const visual = cellClass(cell.state, color);
                  return (
                    <div
                      key={cell.stationId}
                      className={visual.className}
                      style={visual.style}
                      title={`${cell.shortName || cell.name}：${visual.title}`}
                    />
                  );
                })}
                <div className="text-center text-lg font-semibold text-white">
                  {row.rank}
                </div>
                <div className="text-center text-sm font-medium text-[#d7e6f7]">
                  {row.passRate}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-5 flex flex-wrap gap-4 text-xs text-[#9bb6d4] sm:text-sm">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0c1729]/60 px-3 py-2">
            <span
              className="h-4 w-4 rounded"
              style={{ backgroundColor: STATION_COLORS[0] }}
            />
            已完成關卡（依關卡著色）
            <span className="ml-2 h-4 w-4 rounded bg-[#3a4558]" />
            未完成關卡（灰色）
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0c1729]/60 px-3 py-2">
            <span
              className="h-4 w-4 rounded border-2 bg-transparent"
              style={{ borderColor: STATION_COLORS[4] }}
            />
            不通過（空心色框）
          </div>
        </footer>
      </div>
    </div>
  );
}
