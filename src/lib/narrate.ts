import type { SerializedValue, Step } from "./trace";
import { valueLabel } from "./trace";

function labels(v: SerializedValue | undefined): string[] {
  if (!v) return [];
  if (v.kind === "set" || v.kind === "array" || v.kind === "deque")
    return v.data.map(valueLabel);
  if (v.kind === "dict") return v.data.map((e) => valueLabel(e.k));
  return [];
}

function diff(a: string[], b: string[]) {
  const am = new Map<string, number>();
  for (const x of a) am.set(x, (am.get(x) ?? 0) + 1);
  const removed: string[] = [];
  const bm = new Map<string, number>();
  for (const x of b) bm.set(x, (bm.get(x) ?? 0) + 1);
  const added: string[] = [];
  for (const [x, n] of bm) {
    const d = n - (am.get(x) ?? 0);
    for (let i = 0; i < d; i++) added.push(x);
  }
  for (const [x, n] of am) {
    const d = n - (bm.get(x) ?? 0);
    for (let i = 0; i < d; i++) removed.push(x);
  }
  return { added, removed };
}

/** One-line plain-English description of what changed this step. */
export function narrate(prev: Step | undefined, cur: Step): string {
  if (!prev) return "start tracing";

  // structure inserts / removes (most informative)
  for (const [name, v] of Object.entries(cur.vars)) {
    const p = prev.vars[name];
    if (!p || p.kind !== v.kind) continue;
    if (v.kind === "set" || v.kind === "dict" || v.kind === "array" || v.kind === "deque") {
      const { added, removed } = diff(labels(p), labels(v));
      const verb =
        v.kind === "set" ? "added to" : v.kind === "dict" ? "inserted into" : "pushed to";
      if (added.length) return `${added.join(", ")} ${verb} ${name}`;
      if (removed.length) return `${removed.join(", ")} removed from ${name}`;
    }
  }

  // scalar updates (pointers, sums, etc.)
  for (const [name, v] of Object.entries(cur.vars)) {
    const p = prev.vars[name];
    if (v.kind !== "scalar") continue;
    if (!p) return `${name} = ${valueLabel(v)}`;
    if (p.kind === "scalar" && valueLabel(p) !== valueLabel(v)) {
      return `${name}: ${valueLabel(p)} → ${valueLabel(v)}`;
    }
  }

  if (cur.event === "return" && cur.ret) return `return ${valueLabel(cur.ret)}`;
  if ((cur.stack?.length ?? 0) > (prev.stack?.length ?? 0)) return `call ${cur.func}()`;
  return `executing line ${cur.line}`;
}
