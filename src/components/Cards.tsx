import { AnimatePresence, motion } from "framer-motion";
import type { SerializedValue } from "@/lib/trace";
import { valueLabel } from "@/lib/trace";
import { DS_KINDS, DS_META, type DSKind, type Pointer } from "@/lib/classify";
import { cellId, keyId, setId, structId } from "@/lib/ids";
import { TreeView, type TNode } from "./TreeView";

export type { Pointer };

const SPRING = { type: "spring" as const, stiffness: 380, damping: 30 };

/* ----------------------------- shared bits ------------------------------ */

export function StructCard({
  name,
  kind,
  changed,
  onOverride,
  children,
}: {
  name: string;
  kind: DSKind;
  changed?: boolean;
  onOverride?: (kind: DSKind) => void;
  children: React.ReactNode;
}) {
  const color = DS_META[kind].color;
  return (
    <motion.div
      layout
      data-elid={structId(name)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={SPRING}
      className="relative h-fit rounded-2xl border bg-card/70 p-4 backdrop-blur"
      style={{
        borderColor: changed ? color : "var(--border)",
        boxShadow: changed ? `0 0 0 1px ${color}, 0 8px 40px -12px ${color}` : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute -top-px left-6 right-6 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        <span className="font-mono text-sm font-semibold">{name}</span>
        <select
          value={kind}
          onChange={(e) => onOverride?.(e.target.value as DSKind)}
          title="Change how this is visualized"
          className="ml-auto cursor-pointer appearance-none rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider outline-none"
          style={{ color, background: `color-mix(in oklch, ${color} 14%, transparent)` }}
        >
          {DS_KINDS.filter((k) => k !== "scalar").map((k) => (
            <option key={k} value={k} className="bg-card text-foreground">
              {DS_META[k].label}
            </option>
          ))}
        </select>
      </div>
      {children}
    </motion.div>
  );
}

function Cell({
  label,
  color,
  active,
  faded,
  elid,
}: {
  label: string;
  color: string;
  active?: boolean;
  faded?: boolean;
  elid?: string;
}) {
  return (
    <motion.div
      layout
      data-elid={elid}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: faded ? 0.4 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={SPRING}
      className="grid min-w-9 place-items-center rounded-lg border px-2 py-2 font-mono text-sm"
      style={{
        borderColor: active ? color : "var(--border)",
        background: active ? `color-mix(in oklch, ${color} 22%, transparent)` : "oklch(1 0 0 / 4%)",
        color: active ? "white" : undefined,
      }}
    >
      {label}
    </motion.div>
  );
}

/* ------------------------------- Array ---------------------------------- */

export function ArrayCard({
  elPrefix,
  v,
  pointers = [],
  color,
}: {
  elPrefix: string;
  v: Extract<SerializedValue, { kind: "array" }>;
  pointers?: Pointer[];
  color: string;
}) {
  const byIndex = new Map<number, string[]>();
  for (const p of pointers) {
    if (!byIndex.has(p.index)) byIndex.set(p.index, []);
    byIndex.get(p.index)!.push(p.name);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {v.data.map((item, i) => {
        const ptrs = byIndex.get(i);
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="font-mono text-[0.6rem] text-muted-foreground">{i}</span>
            <Cell label={valueLabel(item)} color={color} active={!!ptrs} elid={cellId(elPrefix, i)} />
            <div className="flex h-4 items-end gap-0.5">
              {ptrs?.map((pn) => (
                <span
                  key={pn}
                  className="rounded px-1 font-mono text-[0.6rem] font-bold"
                  style={{ color, background: `color-mix(in oklch, ${color} 20%, transparent)` }}
                >
                  {pn}
                </span>
              ))}
            </div>
          </div>
        );
      })}
      {v.data.length === 0 && <Empty />}
    </div>
  );
}

/* ------------------------------- Stack ---------------------------------- */

export function StackCard({
  elPrefix,
  v,
  color,
}: {
  elPrefix: string;
  v: Extract<SerializedValue, { kind: "array" }>;
  color: string;
}) {
  const items = [...v.data].reverse(); // top first
  return (
    <div className="flex flex-col items-center gap-1.5">
      {items.length > 0 && (
        <span className="font-mono text-[0.6rem]" style={{ color }}>
          ← top
        </span>
      )}
      <AnimatePresence initial={false}>
        {items.map((item, idx) => {
          const realIndex = v.data.length - 1 - idx;
          return (
            <motion.div
              key={realIndex}
              layout
              data-elid={cellId(elPrefix, realIndex)}
              initial={{ opacity: 0, y: -16, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.6 }}
              transition={SPRING}
              className="grid w-20 place-items-center rounded-lg border py-2 font-mono text-sm"
              style={{
                borderColor: idx === 0 ? color : "var(--border)",
                background: idx === 0 ? `color-mix(in oklch, ${color} 20%, transparent)` : "oklch(1 0 0 / 4%)",
                color: idx === 0 ? "white" : undefined,
              }}
            >
              {valueLabel(item)}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {items.length === 0 && <Empty />}
    </div>
  );
}

/* ---------------------------- Queue / Deque ----------------------------- */

export function QueueCard({
  elPrefix,
  v,
  color,
}: {
  elPrefix: string;
  v: Extract<SerializedValue, { kind: "array" | "deque" }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[0.6rem]" style={{ color }}>
        front
      </span>
      <div className="flex gap-1.5 rounded-xl border border-dashed px-2 py-2" style={{ borderColor: "var(--border)" }}>
        <AnimatePresence initial={false}>
          {v.data.map((item, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, x: 18, scale: 0.6 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -18, scale: 0.6 }}
              transition={SPRING}
            >
              <Cell label={valueLabel(item)} color={color} active={i === 0} elid={cellId(elPrefix, i)} />
            </motion.div>
          ))}
        </AnimatePresence>
        {v.data.length === 0 && <Empty />}
      </div>
      <span className="font-mono text-[0.6rem] text-muted-foreground">back</span>
    </div>
  );
}

/* ------------------------------ HashMap --------------------------------- */

export function HashMapCard({
  elPrefix,
  v,
  color,
}: {
  elPrefix: string;
  v: Extract<SerializedValue, { kind: "dict" }>;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {v.data.map(({ k, v: val }) => {
          const key = valueLabel(k);
          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={SPRING}
              className="flex items-center gap-2 font-mono text-sm"
            >
              <span
                data-elid={keyId(elPrefix, key)}
                className="min-w-9 rounded-md border px-2 py-1 text-center"
                style={{ borderColor: color, background: `color-mix(in oklch, ${color} 12%, transparent)` }}
              >
                {key}
              </span>
              <span style={{ color }}>→</span>
              <span className="min-w-9 rounded-md border border-border px-2 py-1 text-center" style={{ background: "oklch(1 0 0 / 4%)" }}>
                {valueLabel(val)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {v.data.length === 0 && <Empty />}
    </div>
  );
}

/* -------------------------------- Set ----------------------------------- */

export function SetCard({
  elPrefix,
  v,
  color,
}: {
  elPrefix: string;
  v: Extract<SerializedValue, { kind: "set" }>;
  color: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {v.data.map((item) => {
          const label = valueLabel(item);
          return (
            <motion.div
              key={label}
              layout
              data-elid={setId(elPrefix, label)}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={SPRING}
              className="grid size-9 place-items-center rounded-full border font-mono text-sm"
              style={{ borderColor: color, background: `color-mix(in oklch, ${color} 16%, transparent)` }}
            >
              {label}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {v.data.length === 0 && <Empty />}
    </div>
  );
}

/* ----------------------- Node fallback (P4 upgrades) -------------------- */

export function NodeCard({
  v,
  color,
}: {
  v: Extract<SerializedValue, { kind: "node" }>;
  color: string;
}) {
  // follow a `next` chain into a horizontal linked-list if present
  const chain: Extract<SerializedValue, { kind: "node" }>[] = [];
  let cur: SerializedValue | undefined = v;
  const seen = new Set<number>();
  while (cur && cur.kind === "node" && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.push(cur);
    cur = cur.attrs["next"];
  }
  if (chain.length > 1) {
    return (
      <div className="flex items-center gap-1">
        {chain.map((n, i) => (
          <div key={n.id} className="flex items-center gap-1">
            <Cell label={valueLabel(n.attrs["val"] ?? n.attrs["value"] ?? { kind: "scalar", value: "" })} color={color} active={i === 0} />
            {i < chain.length - 1 && <span style={{ color }}>→</span>}
          </div>
        ))}
        {cur && cur.kind === "ref" && <span style={{ color }}>↺</span>}
        {!cur && <span className="font-mono text-xs text-muted-foreground">→ None</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
      {Object.entries(v.attrs).map(([k, val]) => (
        <span key={k} className="rounded-md border border-border px-2 py-1" style={{ background: "oklch(1 0 0 / 4%)" }}>
          <span className="text-muted-foreground">{k}:</span> {valueLabel(val)}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------- Tree ----------------------------------- */

function buildTreeFromNode(v: SerializedValue | undefined): TNode | null {
  if (!v || v.kind !== "node") return null;
  const valAttr = v.attrs["val"] ?? v.attrs["value"];
  return {
    id: String(v.id),
    label: valAttr ? valueLabel(valAttr) : "",
    left: buildTreeFromNode(v.attrs["left"]),
    right: buildTreeFromNode(v.attrs["right"]),
  };
}

export function TreeCard({
  v,
  color,
}: {
  v: Extract<SerializedValue, { kind: "node" }>;
  color: string;
}) {
  return <TreeView root={buildTreeFromNode(v)} color={color} />;
}

/* ------------------------------- Heap ----------------------------------- */

export function HeapCard({
  v,
  color,
}: {
  v: Extract<SerializedValue, { kind: "array" | "deque" }>;
  color: string;
}) {
  const items = v.data;
  if (items.length === 0) return <Empty />;
  const make = (i: number): TNode | null =>
    i >= items.length
      ? null
      : {
          id: String(i),
          label: valueLabel(items[i]),
          active: i === 0,
          left: make(2 * i + 1),
          right: make(2 * i + 2),
        };
  return <TreeView root={make(0)} color={color} />;
}

/* ---------------------------- Grid / 2-D DP ----------------------------- */

export function GridCard({
  v,
  prev,
  color,
}: {
  v: Extract<SerializedValue, { kind: "array" }>;
  prev?: SerializedValue;
  color: string;
}) {
  const rows = v.data.map((r) => (r.kind === "array" ? r.data : []));
  const prevRows =
    prev && prev.kind === "array"
      ? prev.data.map((r) => (r.kind === "array" ? r.data : []))
      : [];
  const cellChanged = (i: number, j: number, cell: SerializedValue) => {
    const pr = prevRows[i];
    if (!pr || pr[j] === undefined) return false;
    return valueLabel(pr[j]) !== valueLabel(cell);
  };
  return (
    <div className="flex flex-col gap-1">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1">
          {row.map((cell, j) => {
            const hot = cellChanged(i, j, cell);
            return (
              <div
                key={j}
                className="grid size-9 place-items-center rounded-md border font-mono text-xs transition-colors"
                style={{
                  borderColor: hot ? color : "var(--border)",
                  background: hot
                    ? `color-mix(in oklch, ${color} 26%, transparent)`
                    : "oklch(1 0 0 / 4%)",
                  color: hot ? "white" : undefined,
                }}
              >
                {valueLabel(cell)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <span className="font-mono text-xs text-muted-foreground">∅ empty</span>;
}
