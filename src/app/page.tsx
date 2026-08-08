"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listBootstrap } from "@/lib/client-db";

interface TeamItem {
  id: string;
  name: string;
  emblem: string;
}

type Step = "identity" | "pick-team";

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [eventName, setEventName] = useState("棕熊營闖關活動");

  useEffect(() => {
    void listBootstrap()
      .then((data) => {
        setTeams(data.teams ?? []);
        if (data.event?.name) setEventName(data.event.name);
      })
      .catch(() => undefined);
  }, []);

  function chooseStudent() {
    sessionStorage.setItem("role", "student");
    sessionStorage.removeItem("gmUnlocked");
    setStep("pick-team");
  }

  function chooseGm() {
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("gmUnlocked");
    router.push("/gm");
  }

  return (
    <div className="home-screen mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <header className="mb-8 text-center">
        <p className="text-xs tracking-[0.35em] text-[#9bb6d4]">BROWN BEAR CAMP</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-wide text-[#f0c674]">
          棕熊營系統
        </h1>
        <p className="mt-3 text-sm text-[#b8cce0]">{eventName}</p>
      </header>

      {step === "identity" && (
        <section className="flex flex-1 flex-col justify-center gap-5">
          <div className="mb-2 text-center">
            <p className="text-xs tracking-[0.3em] text-[#f0c674]/80">STEP 1</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">請選擇身分</h2>
            <p className="mt-2 text-sm text-[#9bb6d4]">學員與關主請先選定身分再進入</p>
          </div>

          <button
            type="button"
            onClick={chooseStudent}
            className="rounded-3xl border-2 border-[#f0c674] bg-[#0d2244] p-7 text-left transition hover:bg-[#12315a] active:scale-[0.99]"
          >
            <p className="text-xs tracking-[0.3em] text-[#9bb6d4]">STUDENT</p>
            <h3 className="mt-2 text-3xl font-bold text-[#f0c674]">學員</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#b8cce0]">
              查看闖關進度、出示小隊專屬 QR Code
            </p>
          </button>

          <button
            type="button"
            onClick={chooseGm}
            className="rounded-3xl border-2 border-[#f0c674]/70 bg-[#0d2244]/90 p-7 text-left transition hover:border-[#f0c674] hover:bg-[#12315a] active:scale-[0.99]"
          >
            <p className="text-xs tracking-[0.3em] text-[#9bb6d4]">GAME MASTER</p>
            <h3 className="mt-2 text-3xl font-bold text-[#f0c674]">關主</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#b8cce0]">
              鎖定關卡、掃描 QR、判定通過／不通過
            </p>
          </button>
        </section>
      )}

      {step === "pick-team" && (
        <section className="flex flex-1 flex-col">
          <button
            type="button"
            onClick={() => setStep("identity")}
            className="mb-5 self-start text-sm text-[#9bb6d4]"
          >
            ← 返回選擇身分
          </button>

          <div className="mb-5 text-center">
            <p className="text-xs tracking-[0.3em] text-[#f0c674]/80">學員</p>
            <h2 className="mt-2 text-xl font-semibold text-white">選擇你的小隊</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => {
                  sessionStorage.setItem("teamId", team.id);
                  router.push(`/team/${team.id}`);
                }}
                className="rounded-2xl border border-[#f0c674]/45 bg-[#0d2244]/70 px-3 py-5 text-center transition hover:border-[#f0c674] hover:bg-[#12315a]"
              >
                <div className="text-3xl text-[#f0c674]">{team.emblem}</div>
                <div className="mt-2 text-sm text-[#d7e6f7]">{team.name}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
