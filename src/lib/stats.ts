import type { SerializedValue, TraceResult } from "./trace";

function size(v: SerializedValue): number {
  if (v.kind === "array" || v.kind === "deque" || v.kind === "set" || v.kind === "dict")
    return v.data.length;
  return 0;
}

export interface Stats {
  ops: number;
  maxDepth: number;
  peak: { name: string; size: number }[];
}

/** Cheap "complexity meter": op count (trace length), recursion depth, and the
 *  peak size each structure reached. */
export function computeStats(trace: TraceResult): Stats {
  const peak = new Map<string, number>();
  let maxDepth = 0;
  for (const step of trace.steps) {
    maxDepth = Math.max(maxDepth, step.depth);
    for (const [name, v] of Object.entries(step.vars)) {
      const s = size(v);
      if (s > 0) peak.set(name, Math.max(peak.get(name) ?? 0, s));
    }
  }
  return {
    ops: trace.steps.length,
    maxDepth,
    peak: [...peak.entries()]
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 5),
  };
}
