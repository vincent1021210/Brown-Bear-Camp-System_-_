"use client";

import { QRCodeSVG } from "qrcode.react";
import type { StationPlayState, TeamQrPayload } from "@/lib/types";

interface StationCardProps {
  order: number;
  name: string;
  state: StationPlayState;
}

function StationCard({ order, name, state }: StationCardProps) {
  const isDark = state === "pending";
  const isPass = state === "pass";
  const isFail = state === "fail";

  return (
    <div
      className={[
        "station-card relative flex aspect-[3/4] flex-col items-center justify-between rounded-[14px] border px-1.5 py-2.5 transition-all duration-500",
        isDark
          ? "border-[#c4a574]/35 bg-transparent opacity-55"
          : isPass
            ? "border-[#f0c674] bg-[#f0c674]/18 shadow-[0_0_18px_rgba(240,198,116,0.65),0_0_4px_rgba(240,198,116,0.9)]"
            : "border-[#f0c674]/85 bg-[#f0c674]/12 shadow-[0_0_14px_rgba(240,198,116,0.4)]",
      ].join(" ")}
    >
      <span
        className={[
          "text-[15px] font-semibold leading-none",
          isDark ? "text-[#c4a574]/55" : "text-[#f0c674]",
        ].join(" ")}
      >
        {order}
      </span>

      <span
        className={[
          "px-0.5 text-center text-[11px] leading-snug font-medium",
          isDark ? "text-[#c4a574]/50" : "text-[#ffe7a8]",
        ].join(" ")}
      >
        {name}
      </span>

      <span
        className={[
          "min-h-[1.1rem] text-[12px] font-bold tracking-wide",
          isDark
            ? "text-transparent"
            : isPass
              ? "text-[#f0c674]"
              : "text-[#ffb4b4]",
        ].join(" ")}
        aria-hidden={isDark}
      >
        {isPass ? "通過" : isFail ? "不通過" : "·"}
      </span>
    </div>
  );
}

interface TeamScreenProps {
  teamName: string;
  qrPayload: TeamQrPayload;
  progress: Array<{
    stationId: string;
    order: number;
    name: string;
    shortName?: string;
    state: StationPlayState;
  }>;
  passCount: number;
  totalStations: number;
}

export function TeamScreen({
  teamName,
  qrPayload,
  progress,
  passCount,
  totalStations,
}: TeamScreenProps) {
  const cols = progress.length <= 6 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="team-screen mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-12">
      <header className="mb-6 text-center">
        <p className="text-xs tracking-[0.25em] text-[#9bb6d4]">{teamName}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-wide text-[#f0c674]">
          你的闖關進度
        </h1>
      </header>

      <section className={`grid ${cols} gap-2.5`}>
        {progress.map((item) => (
          <StationCard
            key={item.stationId}
            order={item.order}
            name={item.shortName || item.name}
            state={item.state}
          />
        ))}
      </section>

      <section className="mt-8 flex flex-1 flex-col items-center">
        <p className="mb-4 text-center text-sm font-medium text-[#f0c674]">
          掃描小隊 QR Code 開始闖關！
        </p>
        <div className="rounded-xl bg-white p-3 shadow-[0_0_24px_rgba(240,198,116,0.15)]">
          <QRCodeSVG
            value={JSON.stringify(qrPayload)}
            size={210}
            level="M"
            includeMargin={false}
          />
        </div>
      </section>

      <footer className="mt-8">
        <div className="rounded-xl border border-[#5bc0de]/80 bg-transparent px-4 py-3 text-center text-white">
          完成度 {passCount}/{totalStations}
        </div>
      </footer>
    </div>
  );
}
