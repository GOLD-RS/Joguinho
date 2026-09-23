"use client";

import { useEffect, useRef, useState } from "react";
import { startGame, type GameOverStats } from "@/game/engine";

type Row = { id: number; name: string; score: number; maxCombo: number; perfects: number };

export default function FlappyGame() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [over, setOver] = useState<GameOverStats | null>(null);
  const [board, setBoard] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [sent, setSent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () =>
    fetch("/api/scores").then((r) => r.json()).then((d) => setBoard(d.scores ?? [])).catch(() => {});

  useEffect(() => {
    setName(localStorage.getItem("faName") ?? "");
    const stop = startGame(ref.current!, {
      onGameOver: (s) => { setOver(s); setSent(null); setErr(""); load(); },
      onRestart: () => setOver(null),
    });
    return stop;
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!over || !name.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      localStorage.setItem("faName", name.trim());
      const r = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), score: over.score, pipes: over.pipes, perfects: over.perfects, maxCombo: over.maxCombo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro");
      setSent(d.id); setBoard(d.scores);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao enviar");
    } finally { setBusy(false); }
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
            <h2 className="text-sm font-extrabold tracking-wider text-yellow-300">🏆 RANKING GLOBAL</h2>
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
                {busy ? "..." : `Enviar ${over.score}`}
              </button>
            </form>
          )}
          {err && <p className="mb-2 text-xs text-red-300">{err}</p>}
          <ol className="space-y-1 text-sm">
            {board.length === 0 && <li className="text-white/50">Seja o primeiro no ranking!</li>}
            {board.map((r, i) => (
              <li key={r.id} className={`flex justify-between rounded px-2 py-0.5 ${r.id === sent ? "bg-yellow-400/25" : ""}`}>
                <span className="truncate">
                  <b className="mr-2 inline-block w-5 text-white/50">{i + 1}</b>{r.name}
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
