import type { SerializedValue } from "./trace";

export type DSKind =
  | "array"
  | "grid"
  | "stack"
  | "queue"
  | "hashmap"
  | "set"
  | "heap"
  | "linkedlist"
  | "tree"
  | "graph"
  | "node"
  | "scalar";

export const DS_META: Record<DSKind, { label: string; color: string }> = {
  array: { label: "Array", color: "var(--ds-array)" },
  grid: { label: "Grid / DP", color: "var(--ds-tree)" },
  stack: { label: "Stack", color: "var(--ds-stack)" },
  queue: { label: "Queue", color: "var(--ds-queue)" },
  hashmap: { label: "Hash Map", color: "var(--ds-hashmap)" },
  set: { label: "Set", color: "var(--ds-set)" },
  heap: { label: "Heap", color: "var(--ds-heap)" },
  linkedlist: { label: "Linked List", color: "var(--ds-linkedlist)" },
  tree: { label: "Tree", color: "var(--ds-tree)" },
  graph: { label: "Graph", color: "var(--ds-graph)" },
  node: { label: "Node", color: "var(--ds-linkedlist)" },
  scalar: { label: "Value", color: "var(--ds-scalar)" },
};

const STACK_NAMES = /^(stack|stk|st|monostack)$/i;
const QUEUE_NAMES = /^(queue|q|dq|bfs|frontier)$/i;
const HEAP_NAMES = /^(heap|pq|minheap|maxheap|heapq|min_heap|max_heap)$/i;

export interface Pointer {
  name: string;
  index: number;
}

export const POINTER_NAMES = new Set([
  "i", "j", "k", "l", "r", "left", "right", "lo", "hi", "mid",
  "start", "end", "p", "q", "slow", "fast", "front", "back", "a", "b", "cur",
]);

/** Heuristic data-structure kind for a top-level variable. Overridable in UI. */
export function classify(name: string, v: SerializedValue): DSKind {
  switch (v.kind) {
    case "dict":
      return "hashmap";
    case "set":
      return "set";
    case "deque":
      return "queue";
    case "array":
      if (v.data.length > 0 && v.data.every((it) => it.kind === "array")) return "grid";
      if (HEAP_NAMES.test(name)) return "heap";
      if (STACK_NAMES.test(name)) return "stack";
      if (QUEUE_NAMES.test(name)) return "queue";
      return "array";
    case "node": {
      const a = v.attrs;
      if ("left" in a || "right" in a) return "tree";
      if ("neighbors" in a || "neighbours" in a || "adj" in a || "children" in a)
        return "graph";
      if ("next" in a || "prev" in a) return "linkedlist";
      return "node";
    }
    case "scalar":
    case "ref":
      return "scalar";
  }
}

export const DS_KINDS: DSKind[] = [
  "array", "grid", "stack", "queue", "hashmap", "set", "heap",
  "linkedlist", "tree", "graph", "node", "scalar",
];

/** Top-level structures get their own card; scalars go in the locals strip. */
export function isStructure(kind: DSKind): boolean {
  return kind !== "scalar";
}
