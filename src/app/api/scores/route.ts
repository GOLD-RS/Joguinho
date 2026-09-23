import { NextResponse } from "next/server";
import { db } from "@/db";
import { scores } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function top() {
  return db
    .select({ id: scores.id, name: scores.name, score: scores.score, maxCombo: scores.maxCombo, perfects: scores.perfects })
    .from(scores)
    .orderBy(desc(scores.score), scores.createdAt)
    .limit(10);
}

export async function GET() {
  try {
    return NextResponse.json({ scores: await top() });
  } catch {
    return NextResponse.json({ scores: [] });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const name = String(body.name ?? "").replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 16);
  const int = (v: unknown, max: number) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= max ? n : -1;
  };
  const score = int(body.score, 100000);
  const pipes = int(body.pipes, 100000);
  const perfects = int(body.perfects, 100000);
  const maxCombo = int(body.maxCombo, 5);
  // sanity: each pipe yields at most 5 points (+1 near-miss bonus)
  if (!name || score <= 0 || pipes < 0 || perfects < 0 || maxCombo < 0 || score > pipes * 6 || perfects > pipes) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const [row] = await db.insert(scores).values({ name, score, pipes, perfects, maxCombo: Math.max(1, maxCombo) }).returning({ id: scores.id });
  return NextResponse.json({ id: row.id, scores: await top() });
}
