"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
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

function cellVisual(state: StationPlayState, color: string) {
  if (state === "pass") {
    return {
      className:
        "flex h-9 min-w-9 flex-1 items-center justify-center rounded-lg text-sm font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.08)]",
      style: { backgroundColor: color } as CSSProperties,
      label: "通過",
      mark: "✓",
    };
  }
  if (state === "fail") {
    return {
      className:
        "flex h-9 min-w-9 flex-1 items-center justify-center rounded-lg border-2 bg-[#0c1729] text-sm font-bold",
      style: { borderColor: color, color } as CSSProperties,
      label: "不通過",
      mark: "✕",
    };
  }
  return {
    className:
      "flex h-9 min-w-9 flex-1 items-center justify-center rounded-lg bg-[#3a4558] text-sm text-transparent",
    style: undefined as CSSProperties | undefined,
    label: "未完成",
    mark: "·",
  };
}

export function TeamBoardClient() {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

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
          <Link href="/" className="text-sm text-[#9bb6d4]">
            ← 返回選擇身分
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
            className="mb-3 grid min-w-[980px] items-end gap-2 text-center text-[11px] leading-snug text-[#9bb6d4] sm:text-xs"
            style={{
              gridTemplateColumns: `7.5rem repeat(${stationCount}, minmax(5.5rem, 1fr)) 4.5rem 5rem`,
            }}
          >
            <div className="pb-1 text-left text-sm">小隊</div>
            {data.stations.map((station) => (
              <div key={station.id} title={`第${station.order}關：${station.name}`}>
                <span className="block font-medium text-[#d7e6f7]">
                  第{station.order}關
                </span>
                <span className="mt-0.5 block">{station.name}</span>
              </div>
            ))}
            <div className="pb-1">目前排行</div>
            <div className="pb-1">總通關率</div>
          </div>

          <div className="min-w-[980px] space-y-2.5">
            {data.rows.map((row) => (
              <div
                key={row.team.id}
                className="grid items-center gap-2"
                style={{
                  gridTemplateColumns: `7.5rem repeat(${stationCount}, minmax(5.5rem, 1fr)) 4.5rem 5rem`,
                }}
              >
                <div className="truncate text-left text-sm font-medium text-[#e8eef7]">
                  {row.team.emblem}小隊
                </div>
                {row.progress.map((cell, idx) => {
                  const color =
                    STATION_COLORS[idx % STATION_COLORS.length] ?? "#3B82F6";
                  const visual = cellVisual(cell.state, color);
                  return (
                    <div
                      key={cell.stationId}
                      className={visual.className}
                      style={visual.style}
                      title={`${cell.name}：${visual.label}`}
                      aria-label={`${cell.name}：${visual.label}`}
                    >
                      {visual.mark}
                    </div>
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

        <footer className="mt-5 space-y-3 text-xs text-[#9bb6d4] sm:text-sm">
          <div className="rounded-xl border border-white/10 bg-[#0c1729]/60 px-3 py-3">
            <p className="mb-2 font-medium text-[#d7e6f7]">
              通過：依關卡著色（實心 + ✓）
            </p>
            <div className="flex flex-wrap gap-2">
              {data.stations.map((station, idx) => {
                const color =
                  STATION_COLORS[idx % STATION_COLORS.length] ?? "#3B82F6";
                return (
                  <span
                    key={station.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1"
                  >
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      ✓
                    </span>
                    第{station.order}關
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0c1729]/60 px-3 py-2">
              <span className="h-4 w-4 rounded bg-[#3a4558]" />
              未完成（灰色）
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0c1729]/60 px-3 py-2">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded border-2 bg-[#0c1729] text-[10px] font-bold"
                style={{
                  borderColor: STATION_COLORS[4],
                  color: STATION_COLORS[4],
                }}
              >
                ✕
              </span>
              不通過（該關空心色框 + ✕）
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
