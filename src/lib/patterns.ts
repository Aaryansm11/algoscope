import type { TraceResult } from "./trace";
import { classify, POINTER_NAMES } from "./classify";

/** Heuristically label the algorithmic technique(s) used, for a learning hint. */
export function detectPatterns(trace: TraceResult): string[] {
  const tags = new Set<string>();
  const kinds = new Set<string>();
  let maxDepth = 0;
  let sawDeque = false;
  let sawHeap = false;
  let multiPointer = false;

  for (const step of trace.steps) {
    maxDepth = Math.max(maxDepth, step.depth);
    const ptrs: string[] = [];
    let has1dArray = false;
    for (const [name, v] of Object.entries(step.vars)) {
      const k = classify(name, v);
      kinds.add(k);
      if (v.kind === "deque") sawDeque = true;
      if (k === "heap") sawHeap = true;
      if (k === "array") has1dArray = true;
      if (v.kind === "scalar" && v.str && typeof v.value === "string" && v.value.length > 1)
        has1dArray = true; // string indexed by pointers
      if (POINTER_NAMES.has(name) && v.kind === "scalar" && typeof v.value === "number")
        ptrs.push(name);
    }
    // two-pointer only if ≥2 pointers actually move over a 1-D array/string
    if (ptrs.length >= 2 && has1dArray) multiPointer = true;
  }

  if (maxDepth >= 2) tags.add("Recursion / DFS");
  if (sawDeque) tags.add("BFS");
  if (sawHeap) tags.add("Heap / priority queue");
  if (multiPointer) tags.add("Two pointers / sliding window");
  if (kinds.has("stack")) tags.add("Stack");
  if (kinds.has("hashmap")) tags.add("Hash map lookup");
  if (kinds.has("grid")) tags.add("Dynamic programming");

  return [...tags];
}
