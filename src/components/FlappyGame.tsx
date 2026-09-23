"use client";

import { useEffect, useRef, useState } from "react";
import { startGame, type GameOverStats } from "@/game/engine";

type Row = { id: number; name: string; score: number; maxCombo: number; perfects: number };

const KEY = "faScores";

// Ranking 100% local (offline): top-10 em localStorage, sem servidor.
function loadBoard(): Row[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list: Row[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveBoard(rows: Row[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export default function FlappyGame() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [over, setOver] = useState<GameOverStats | null>(null);
  const [board, setBoard] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [sent, setSent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [armClear, setArmClear] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem("faName") ?? "");
    setBoard(loadBoard());
    const stop = startGame(ref.current!, {
      onGameOver: (s) => {
        setOver(s);
        setSent(null);
        setBoard(loadBoard());
      },
      onRestart: () => setOver(null),
    });
    return stop;
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!over || !name.trim() || busy) return;
    setBusy(true);
    const entry: Row = {
      id: Date.now(),
      name: name.trim().slice(0, 16),
      score: over.score,
      maxCombo: over.maxCombo,
      perfects: over.perfects,
    };
    localStorage.setItem("faName", entry.name);
    const next = [...board, entry].sort((a, b) => b.score - a.score).slice(0, 10);
    saveBoard(next);
    setBoard(next);
    setSent(entry.id);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b1e3a]">
      <canvas ref={ref} className="block h-screen w-screen touch-none" />
      {over && (
        <div
          className="absolute bottom-3 left-1/2 w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#0c1423]/90 p-3 text-white shadow-2xl backdrop-blur"
          onPointerDown={(e) => e.stopPropagation()}
          style={{ maxHeight: "34vh", overflowY: "auto" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold tracking-wider text-yellow-300">🏆 RANKING</h2>
            <button
              onClick={() => {
                if (armClear) {
                  saveBoard([]);
                  setBoard([]);
                  setArmClear(false);
                } else {
                  setArmClear(true);
                  setTimeout(() => setArmClear(false), 3000);
                }
              }}
              className={`text-xs ${armClear ? "font-bold text-red-300" : "text-white/40 hover:text-white/70"}`}
            >
              {armClear ? "confirma?" : "limpar"}
            </button>
          </div>
          {over.score > 0 && sent === null && (
            <form onSubmit={submit} className="mb-2 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                placeholder="Seu nome"
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none ring-yellow-300 focus:ring-2"
              />
              <button disabled={busy || !name.trim()} className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-slate-900 disabled:opacity-50">
                {busy ? "..." : `Salvar ${over.score}`}
              </button>
            </form>
          )}
          <ol className="space-y-1 text-sm">
            {board.length === 0 && <li className="text-white/50">Seja o primeiro no ranking!</li>}
            {board.map((r, i) => (
              <li key={r.id} className={`flex justify-between rounded px-2 py-0.5 ${r.id === sent ? "bg-yellow-400/25" : ""}`}>
                <span className="truncate">
                  <b className="mr-2 inline-block w-5 text-white/50">{i + 1}</b>
                  {r.name}
                </span>
                <span className="font-bold text-yellow-300">{r.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
