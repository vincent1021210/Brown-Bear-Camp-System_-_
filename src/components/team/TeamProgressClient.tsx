"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeamScreen } from "@/components/team/TeamScreen";
import { getTeamProgress } from "@/lib/client-db";
import type { StationPlayState, TeamQrPayload } from "@/lib/types";

interface TeamPageData {
  team: {
    id: string;
    name: string;
    eventId: string;
    emblem: string;
  };
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

export function TeamProgressClient({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [data, setData] = useState<TeamPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    if (role !== "student") {
      router.replace("/");
      return;
    }
    setAllowed(true);
  }, [router]);

  useEffect(() => {
    if (!allowed) return;

    let cancelled = false;

    async function load() {
      try {
        const json = await getTeamProgress(teamId);
        if (cancelled) return;
        if (!json) {
          setError("找不到小隊");
          return;
        }
        setData(json);
        setError(null);
      } catch {
        if (!cancelled) setError("載入失敗");
      }
    }

    void load();
    const timer = setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [teamId, allowed]);

  if (!allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1931] text-[#9bb6d4]">
        請先選擇身分…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1931] text-[#f0c674]">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1931] text-[#9bb6d4]">
        載入小隊進度…
      </div>
    );
  }

  const qrPayload: TeamQrPayload = {
    type: "team",
    eventId: data.team.eventId,
    teamId: data.team.id,
  };

  return (
    <div className="relative">
      <div className="absolute left-5 top-4 z-10">
        <Link
          href="/"
          onClick={() => {
            sessionStorage.removeItem("role");
            sessionStorage.removeItem("teamId");
          }}
          className="text-sm text-[#9bb6d4]"
        >
          ← 返回選擇身分
        </Link>
      </div>
      <TeamScreen
        teamName={data.team.name}
        qrPayload={qrPayload}
        progress={data.progress}
        passCount={data.passCount}
        totalStations={data.totalStations}
      />
    </div>
  );
}
