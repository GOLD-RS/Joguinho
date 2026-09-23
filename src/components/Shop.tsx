"use client";

import { useEffect, useState } from "react";
import {
  SKINS,
  TRAILS,
  ACH,
  meta,
  subscribe,
  buyItem,
  equipItem,
  owned,
  itemPrice,
  coinsLeft,
  type Skin,
  type Trail,
} from "@/game/meta";

type Tab = "skins" | "trails" | "ach";

// Mini preview de uma skin num canvas — só pinta as cores (sem física).
function SkinPreview({ skin }: { skin: Skin }) {
  return (
    <div
      className="relative flex h-16 w-16 items-center justify-center rounded-xl"
      style={{ background: `radial-gradient(circle at 35% 30%, ${skin.body[0]}, ${skin.body[2]})` }}
    >
      <div className="h-7 w-9 rounded-[50%]" style={{ background: skin.body[1] }} />
      <div
        className="absolute right-1 h-4 w-4"
        style={{ background: skin.wing, clipPath: "polygon(0 0,100% 50%,0 100%)" }}
      />
      <div className="absolute left-3 top-4 h-2.5 w-2.5 rounded-full bg-white">
        <div className="ml-0.5 mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
      </div>
      <div
        className="absolute right-0 top-1/2 h-2.5 w-4 -translate-y-1/2"
        style={{ background: skin.beak, clipPath: "polygon(0 0,100% 50%,0 100%)" }}
      />
    </div>
  );
}

function TrailPreview({ trail }: { trail: Trail }) {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-white/5">
      {trail.colors.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 30 - i * 5,
            height: 30 - i * 5,
            left: `${58 + i * 12}px`,
            background: c,
            opacity: 0.9 - i * 0.15,
            filter: "blur(1px)",
          }}
        />
      ))}
      <div className="h-6 w-6 rounded-full bg-white/80" />
    </div>
  );
}

export default function Shop({ onClose }: { onClose: () => void }) {
  const [, force] = useState(0);
  const [tab, setTab] = useState<Tab>("skins");
  const [flash, setFlash] = useState("");

  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  const m = meta();
  const coins = m.coins;
  const doBuy = (kind: "skin" | "trail", id: string) => {
    if (owned(kind, id)) {
      equipItem(kind, id);
      return;
    }
    if (coinsLeft(kind, id)) {
      if (buyItem(kind, id)) {
        setFlash("comprado! 🎉");
        setTimeout(() => setFlash(""), 1200);
      }
    } else {
      setFlash("moedas insuficientes");
      setTimeout(() => setFlash(""), 1200);
    }
  };

  const pill = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? "bg-yellow-400 text-slate-900" : "text-white/60"}`;

  const itemBtn = (kind: "skin" | "trail", id: string, price: number) => {
    const has = owned(kind, id);
    const cur = kind === "skin" ? m.skin === id : m.trail === id;
    const afford = coins >= price;
    const label = cur ? "USANDO ✓" : has ? "USAR" : `${price} 💰`;
    const cls = cur
      ? "bg-emerald-400/90 text-slate-900"
      : has
        ? "bg-white/15 text-white"
        : afford
          ? "bg-yellow-400 text-slate-900"
          : "bg-white/10 text-white/40";
    return (
      <button
        onClick={() => doBuy(kind, id)}
        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${cls}`}
      >
        {label}
      </button>
    );
  };

  const achUnlocked = new Set(m.ach);
  const nextAch = ACH.filter((a) => !achUnlocked.has(a.id)).slice(0, 4);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex max-h-[92vh] w-[min(94vw,520px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0c1423] text-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 p-3">
          <h2 className="text-lg font-extrabold tracking-wide text-yellow-300">🛒 LOJA</h2>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-yellow-400/20 px-3 py-1 text-sm font-extrabold text-yellow-300">
              {coins} 💰
            </span>
            {flash && <span className="text-xs font-bold text-emerald-300">{flash}</span>}
            <button onClick={onClose} className="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-bold hover:bg-white/20">
              ✕
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 px-3 pt-2">
          <button className={pill(tab === "skins")} onClick={() => setTab("skins")}>
            🐤 Skins
          </button>
          <button className={pill(tab === "trails")} onClick={() => setTab("trails")}>
            ✨ Trilhas
          </button>
          <button className={pill(tab === "ach")} onClick={() => setTab("ach")}>
            🏆 Conquistas
          </button>
        </div>

        {/* conteúdo */}
        <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: "62vh" }}>
          {tab === "skins" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SKINS.map((s) => (
                <div key={s.id} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 p-2">
                  <SkinPreview skin={s} />
                  <span className="text-center text-[11px] font-bold leading-tight">{s.name}</span>
                  {itemBtn("skin", s.id, itemPrice("skin", s.id))}
                </div>
              ))}
            </div>
          )}

          {tab === "trails" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TRAILS.map((t) => (
                <div key={t.id} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 p-2">
                  <TrailPreview trail={t} />
                  <span className="text-center text-[11px] font-bold leading-tight">{t.name}</span>
                  {itemBtn("trail", t.id, itemPrice("trail", t.id))}
                </div>
              ))}
            </div>
          )}

          {tab === "ach" && (
            <div className="space-y-3">
              {nextAch.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-bold text-white/50">PRÓXIMAS (recompensa)</h3>
                  <div className="space-y-1.5">
                    {nextAch.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                        <div className="text-xl opacity-40">🔒</div>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{a.name}</div>
                          <div className="text-[11px] text-white/50">{a.desc}</div>
                        </div>
                        <span className="text-xs font-extrabold text-yellow-300">+{a.reward}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="mb-1 text-xs font-bold text-white/50">
                  DESBLOQUEADAS ({achUnlocked.size}/{ACH.length})
                </h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {ACH.map((a) => {
                    const got = achUnlocked.has(a.id);
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-2 rounded-lg p-2 ${got ? "bg-emerald-400/15" : "bg-white/5"}`}
                      >
                        <div className="text-xl">{got ? "✅" : "🔒"}</div>
                        <div className="flex-1">
                          <div className={`text-sm font-bold ${got ? "text-emerald-300" : "text-white/70"}`}>{a.name}</div>
                          <div className="text-[11px] text-white/45">{a.desc}</div>
                        </div>
                        <span className={`text-xs font-extrabold ${got ? "text-emerald-300" : "text-yellow-300"}`}>
                          {got ? "ok" : "+" + a.reward}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="border-t border-white/10 p-2 text-center text-[11px] text-white/40">
          Ganhe moedas jogando · perfeito rende bônus · cada 10 pontos dá +3
        </div>
      </div>
    </div>
  );
}
