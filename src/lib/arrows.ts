import type { SerializedValue, Step } from "./trace";
import { valueLabel } from "./trace";
import { DS_META, type DSKind, type Pointer } from "./classify";
import { cellId, keyId, setId, structId, localId } from "./ids";

function labelsOf(v: SerializedValue): string[] {
  if (v.kind === "array" || v.kind === "deque" || v.kind === "set")
    return v.data.map(valueLabel);
  if (v.kind === "dict") return v.data.map((e) => valueLabel(e.k));
  return [];
}

function removedLabels(prev: SerializedValue | undefined, cur: SerializedValue): string[] {
  if (!prev) return [];
  const after = labelsOf(cur);
  const cnt = new Map<string, number>();
  for (const x of after) cnt.set(x, (cnt.get(x) ?? 0) + 1);
  const removed: string[] = [];
  for (const x of labelsOf(prev)) {
    const c = cnt.get(x) ?? 0;
    if (c > 0) cnt.set(x, c - 1);
    else removed.push(x);
  }
  return removed;
}

export interface CardSpec {
  name: string;
  kind: DSKind;
  value: SerializedValue;
}

export interface ArrowSpec {
  from: string;
  to: string;
  color: string;
}

/**
 * Where did data move this step? We look for elements that were just inserted
 * into a structure (set/map/stack/queue) and, when that value currently sits in
 * an array/string, draw an arrow from that source cell to the new element.
 */
export function computeArrows(
  prev: Step | undefined,
  cards: CardSpec[],
  pointers: Pointer[],
  scalars: [string, SerializedValue][] = []
): ArrowSpec[] {
  const pointerIdx = new Set(pointers.map((p) => p.index));

  // source cells indexed by their rendered label (from array-kind cards)
  const sources = new Map<string, { elid: string; isPointer: boolean }[]>();
  for (const c of cards) {
    if (c.kind !== "array" || c.value.kind !== "array") continue;
    c.value.data.forEach((item, i) => {
      const label = valueLabel(item);
      const list = sources.get(label) ?? [];
      list.push({ elid: cellId(c.name, i), isPointer: pointerIdx.has(i) });
      sources.set(label, list);
    });
  }
  const pickSource = (label: string): string | null => {
    const list = sources.get(label);
    if (!list?.length) return null;
    return (list.find((s) => s.isPointer) ?? list[0]).elid;
  };

  const arrows: ArrowSpec[] = [];
  const add = (label: string, to: string, color: string) => {
    const from = pickSource(label);
    if (from && from !== to) arrows.push({ from, to, color });
  };

  for (const c of cards) {
    const prevV = prev?.vars[c.name];
    const color = DS_META[c.kind].color;

    if (c.kind === "set" && c.value.kind === "set") {
      const prevLabels =
        prevV?.kind === "set" ? new Set(prevV.data.map(valueLabel)) : new Set<string>();
      for (const item of c.value.data) {
        const label = valueLabel(item);
        if (!prevLabels.has(label)) add(label, setId(c.name, label), color);
      }
    } else if (c.kind === "hashmap" && c.value.kind === "dict") {
      const prevKeys =
        prevV?.kind === "dict"
          ? new Set(prevV.data.map((e) => valueLabel(e.k)))
          : new Set<string>();
      for (const e of c.value.data) {
        const klabel = valueLabel(e.k);
        if (!prevKeys.has(klabel)) add(klabel, keyId(c.name, klabel), color);
      }
    } else if (
      (c.kind === "stack" || c.kind === "queue") &&
      (c.value.kind === "array" || c.value.kind === "deque")
    ) {
      const prevLen =
        prevV?.kind === "array" || prevV?.kind === "deque" ? prevV.data.length : 0;
      for (let i = prevLen; i < c.value.data.length; i++) {
        add(valueLabel(c.value.data[i]), cellId(c.name, i), color);
      }
    }
  }

  // pop / remove arrows: a value left a structure and landed in a local
  for (const c of cards) {
    const removed = removedLabels(prev?.vars[c.name], c.value);
    if (removed.length === 0) continue;
    const color = DS_META[c.kind].color;
    for (const rl of removed) {
      const dest = scalars.find(([n, v]) => {
        if (valueLabel(v) !== rl) return false;
        const pv = prev?.vars[n];
        return !pv || valueLabel(pv) !== rl; // the local just received it
      });
      if (dest) arrows.push({ from: structId(c.name), to: localId(dest[0]), color });
    }
  }

  return arrows;
}
