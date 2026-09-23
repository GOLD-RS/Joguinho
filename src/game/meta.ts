/* Flappy Aurora — camada de metadados (moedas, loja, conquistas, skins, trilhas).
 * Fonte única de verdade, persistida em localStorage (faMeta). O engine (jogo)
 * e a UI (loja) falam por aqui — nada de servidor/banco, 100% offline. */

export type Skin = {
  id: string;
  name: string;
  price: number;
  body: [string, string, string]; // gradiente (centro, meado, borda)
  wing: string;
  beak: string;
  belly: string;
};

export type Trail = {
  id: string;
  name: string;
  price: number;
  colors: string[];
};

export type RunStats = {
  score: number;
  pipes: number;
  perfects: number;
  maxCombo: number;
  coins: number;
  ghostPipes: number;
  shieldUsed: number;
};

export type Ach = {
  id: string;
  name: string;
  desc: string;
  reward: number;
  cond: (r: RunStats, m: MetaState) => boolean;
};

export type MetaState = {
  coins: number; // saldo atual (gasta na loja)
  earned: number; // total de moedas já ganhas (não volta ao gastar)
  best: number;
  runs: number; // partidas terminadas
  skins: string[];
  skin: string;
  trails: string[];
  trail: string;
  ach: string[];
};

const KEY = "faMeta";

export const SKINS: Skin[] = [
  { id: "aurora", name: "Aurora (clássica)", price: 0, body: ["#ffe873", "#ffc93e", "#f0a020"], wing: "#ffb32e", beak: "#f26522", belly: "#ffffff" },
  { id: "glacier", name: "Glacial", price: 200, body: ["#eaffff", "#8fe8ff", "#2aa6d8"], wing: "#57c4e8", beak: "#1c7fa0", belly: "#ffffff" },
  { id: "ember", name: "Brasa", price: 250, body: ["#ffd9a0", "#ff8c42", "#e04a10"], wing: "#ff6a2a", beak: "#c03010", belly: "#fff0d0" },
  { id: "toxic", name: "Tóxica", price: 300, body: ["#e0ffc0", "#9dff5a", "#4aa832"], wing: "#7dff3e", beak: "#2e8a18", belly: "#f0ffd0" },
  { id: "royal", name: "Real", price: 400, body: ["#e0ccff", "#9a7bff", "#5a2ad8"], wing: "#7a4ae0", beak: "#3a1ca0", belly: "#f5eeff" },
  { id: "neon", name: "Neon", price: 450, body: ["#ff9af5", "#ff3ea0", "#c81e70"], wing: "#ff5ac8", beak: "#a01260", belly: "#ffd0f0" },
  { id: "spirit", name: "Espírito", price: 500, body: ["#f0f4ff", "#b9c6e8", "#7a88b0"], wing: "#9aa8cc", beak: "#5a6880", belly: "#ffffff" },
  { id: "sunset", name: "Pôr do Sol", price: 600, body: ["#ffe0a0", "#ff9a5a", "#ff5a3a"], wing: "#ff7a4a", beak: "#d03a1a", belly: "#fff0d0" },
  { id: "midnight", name: "Meia-Noite", price: 700, body: ["#5a6a9a", "#2a3a68", "#0a1024"], wing: "#3a4a80", beak: "#7a8ac8", belly: "#4a5a88" },
  { id: "gold", name: "Ouro Puro", price: 1000, body: ["#fff8d0", "#ffd23e", "#c98d12"], wing: "#e8b020", beak: "#a06808", belly: "#fff8e0" },
  { id: "candy", name: "Doce", price: 1200, body: ["#ffc0dd", "#ff8ec0", "#ff5a9a"], wing: "#ff8ec0", beak: "#d83a7a", belly: "#fff0f8" },
  { id: "plasma", name: "Plasma", price: 1500, body: ["#b0fff0", "#5ae8d8", "#18b8a8"], wing: "#3ae0d0", beak: "#0aa898", belly: "#e0fff8" },
];

export const TRAILS: Trail[] = [
  { id: "gold", name: "Estrela Dourada", price: 0, colors: ["#ffe873", "#fff6a8"] },
  { id: "aurora", name: "Aurora", price: 250, colors: ["#7dff9a", "#5ae8ff", "#b88cff"] },
  { id: "fire", name: "Fogo", price: 350, colors: ["#ff8c42", "#ffd23e", "#ff3a1a"] },
  { id: "ice", name: "Gelo", price: 450, colors: ["#8fe8ff", "#eaffff", "#b0ecff"] },
  { id: "neon", name: "Neon", price: 700, colors: ["#ff5ac8", "#b88cff", "#5ae8ff"] },
  { id: "plasma", name: "Plasma", price: 1000, colors: ["#5ae8d8", "#18b8a8", "#b0fff0"] },
];

export const ACH: Ach[] = [
  { id: "first", name: "Primeiro Voo", desc: "Passe em 1 tubo", reward: 25, cond: (r) => r.pipes >= 1 },
  { id: "p50", name: "Voo Leve", desc: "50 tubos numa run", reward: 100, cond: (r) => r.pipes >= 50 },
  { id: "p100", name: "Maratonista", desc: "100 tubos numa run", reward: 250, cond: (r) => r.pipes >= 100 },
  { id: "b25", name: "Prata", desc: "Pontuação 25", reward: 75, cond: (r) => r.score >= 25 },
  { id: "b50", name: "Ouro", desc: "Pontuação 50", reward: 150, cond: (r) => r.score >= 50 },
  { id: "b100", name: "Platina", desc: "Pontuação 100", reward: 400, cond: (r) => r.score >= 100 },
  { id: "perf10", name: "Circo Perfeito", desc: "10 PERFEITOS numa run", reward: 120, cond: (r) => r.perfects >= 10 },
  { id: "combo5", name: "Mestre do Combo", desc: "Combo x5", reward: 100, cond: (r) => r.maxCombo >= 5 },
  { id: "coins60", name: "Cofre Cheio", desc: "60 moedas numa run", reward: 150, cond: (r) => r.coins >= 60 },
  { id: "ghost5", name: "Atravessador", desc: "5 tubos em Fantasma", reward: 120, cond: (r) => r.ghostPipes >= 5 },
  { id: "shield3", name: "Inabalável", desc: "3 escudos numa run", reward: 100, cond: (r) => r.shieldUsed >= 3 },
  { id: "bank1k", name: "Magnata", desc: "1.000 moedas acumuladas", reward: 300, cond: (_r, m) => m.earned >= 1000 },
  { id: "run10", name: "Maníaco", desc: "Jogue 10 partidas", reward: 100, cond: (_r, m) => m.runs >= 10 },
  { id: "run50", name: "Lendário", desc: "Jogue 50 partidas", reward: 300, cond: (_r, m) => m.runs >= 50 },
  { id: "allskins", name: "Galeria", desc: "Compre todas as skins", reward: 500, cond: (_r, m) => m.skins.length >= SKINS.length },
  { id: "alltrails", name: "Pintor", desc: "Compre todas as trilhas", reward: 300, cond: (_r, m) => m.trails.length >= TRAILS.length },
];

let _m: MetaState | null = null;
let _ver = 0; // sobe a cada gravação; quem lê faz cache por versão
export function version(): number {
  return _ver;
}

function normalize(o: Partial<MetaState>): MetaState {
  // migra das chaves antigas (faCoins/faBest)
  let legacyCoins: number | null = null;
  let legacyBest: number | null = null;
  try {
    if (localStorage.getItem("faMeta") === null) {
      legacyCoins = +((localStorage.getItem("faCoins") ?? "") || 0) || 0;
      legacyBest = +((localStorage.getItem("faBest") ?? "") || 0) || 0;
    }
  } catch {
    /* ignore */
  }
  const m: MetaState = {
    coins: o.coins ?? legacyCoins ?? 0,
    earned: o.earned ?? o.coins ?? legacyCoins ?? 0,
    best: o.best ?? legacyBest ?? 0,
    runs: Math.max(0, o.runs ?? 0),
    skins: Array.isArray(o.skins) && o.skins.length ? o.skins : ["aurora"],
    skin: typeof o.skin === "string" ? o.skin : "aurora",
    trails: Array.isArray(o.trails) && o.trails.length ? o.trails : ["gold"],
    trail: typeof o.trail === "string" ? o.trail : "gold",
    ach: Array.isArray(o.ach) ? o.ach : [],
  };
  if (!m.skins.includes(m.skin)) m.skin = "aurora";
  if (!m.trails.includes(m.trail)) m.trail = "gold";
  return m;
}

export function meta(): MetaState {
  if (!_m) {
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      raw = null;
    }
    _m = normalize(raw || {});
  }
  return _m;
}

/* Emissores: a UI (loja) assina e re-renderiza ao vivo. */
const subs: (() => void)[] = [];
export function subscribe(fn: () => void): () => void {
  subs.push(fn);
  return () => {
    const i = subs.indexOf(fn);
    if (i >= 0) subs.splice(i, 1);
  };
}
function emit(): void {
  for (const f of subs) f();
}
export function saveMeta(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(_m || meta()));
  } catch {
    /* ignore */
  }
  _ver++;
  emit();
}
export function refreshMeta(): void {
  // recarrega do storage (ex.: outra aba gastou moedas) e notifica
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw) _m = normalize(raw);
  } catch {
    /* ignore */
  }
  emit();
}

export function itemPrice(kind: "skin" | "trail", id: string): number {
  return (kind === "skin" ? SKINS : TRAILS).find((x) => x.id === id)?.price ?? 0;
}

export function owned(kind: "skin" | "trail", id: string): boolean {
  const m = meta();
  return (kind === "skin" ? m.skins : m.trails).includes(id);
}

/** Tenta comprar. Retorna true se comprou/equipou. Não gasta se já tem. */
export function buyItem(kind: "skin" | "trail", id: string): boolean {
  const m = meta();
  const arr = kind === "skin" ? m.skins : m.trails;
  if (arr.includes(id)) {
    if (kind === "skin") m.skin = id;
    else m.trail = id;
    saveMeta();
    return true;
  }
  const price = itemPrice(kind, id);
  if (m.coins < price) return false;
  m.coins -= price;
  arr.push(id);
  if (kind === "skin") m.skin = id;
  else m.trail = id;
  checkAchievements(emptyRun());
  saveMeta();
  return true;
}

export function equipItem(kind: "skin" | "trail", id: string): void {
  const m = meta();
  if (!owned(kind, id)) return;
  if (kind === "skin") m.skin = id;
  else m.trail = id;
  saveMeta();
}

function emptyRun(): RunStats {
  return { score: 0, pipes: 0, perfects: 0, maxCombo: 1, coins: 0, ghostPipes: 0, shieldUsed: 0 };
}

/** Verifica conquistas ainda não desbloqueadas; dá o reward. Retorna as novas. */
export function checkAchievements(r: RunStats): Ach[] {
  const m = meta();
  const out: Ach[] = [];
  for (const a of ACH) {
    if (m.ach.includes(a.id)) continue;
    if (a.cond(r, m)) {
      m.ach.push(a.id);
      m.coins += a.reward;
      m.earned += a.reward;
      out.push(a);
    }
  }
  return out;
}

/** Registra o fim de uma run: banqueia moedas, best, conta a partida e checa conquistas. */
export function addRunStats(r: RunStats): Ach[] {
  const m = meta();
  m.runs += 1;
  m.coins += r.coins;
  m.earned += r.coins;
  if (r.score > m.best) m.best = r.score;
  const newly = checkAchievements(r);
  saveMeta();
  return newly;
}

export function coinsLeft(kind: "skin" | "trail", id: string): boolean {
  return meta().coins >= itemPrice(kind, id);
}

export function skinById(id: string): Skin | undefined {
  return SKINS.find((s) => s.id === id);
}
export function trailById(id: string): Trail | undefined {
  return TRAILS.find((t) => t.id === id);
}
/** Conquistas não desbloqueadas ainda. */
export function achRemaining(): Ach[] {
  const m = meta();
  return ACH.filter((a) => !m.ach.includes(a.id));
}
