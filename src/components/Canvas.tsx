import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye } from "lucide-react";
import type { Step, SerializedValue } from "@/lib/trace";
import { valueLabel } from "@/lib/trace";
import {
  classify,
  DS_META,
  isStructure,
  POINTER_NAMES,
  type DSKind,
  type Pointer,
} from "@/lib/classify";
import { computeArrows, type CardSpec } from "@/lib/arrows";
import { localId } from "@/lib/ids";
import { cn } from "@/lib/utils";
import {
  ArrayCard,
  GridCard,
  HashMapCard,
  HeapCard,
  NodeCard,
  QueueCard,
  SetCard,
  StackCard,
  StructCard,
  TreeCard,
} from "./Cards";
import { ArrowLayer } from "./ArrowLayer";
import { CallStack } from "./CallStack";

type ArrayV = Extract<SerializedValue, { kind: "array" }>;
type DequeV = Extract<SerializedValue, { kind: "array" | "deque" }>;
type DictV = Extract<SerializedValue, { kind: "dict" }>;
type SetV = Extract<SerializedValue, { kind: "set" }>;
type NodeV = Extract<SerializedValue, { kind: "node" }>;

function isIntScalar(v: SerializedValue): boolean {
  return v.kind === "scalar" && typeof v.value === "number" && Number.isInteger(v.value);
}
function isLongString(v: SerializedValue): boolean {
  return v.kind === "scalar" && !!v.str && typeof v.value === "string" && v.value.length > 1;
}
function stringToArray(v: SerializedValue): ArrayV {
  const s = (v as { value: string }).value;
  return {
    kind: "array",
    id: -1,
    data: [...s].map((c) => ({ kind: "scalar", value: c, str: true })),
  };
}

function renderInner(
  name: string,
  kind: DSKind,
  v: SerializedValue,
  color: string,
  ptrs: Pointer[],
  prevValue?: SerializedValue
) {
  switch (kind) {
    case "array":
      return <ArrayCard elPrefix={name} v={v as ArrayV} pointers={ptrs} color={color} />;
    case "grid":
      return <GridCard v={v as ArrayV} prev={prevValue} color={color} />;
    case "stack":
      return <StackCard elPrefix={name} v={v as ArrayV} color={color} />;
    case "queue":
      return <QueueCard elPrefix={name} v={v as DequeV} color={color} />;
    case "heap":
      return <HeapCard v={v as DequeV} color={color} />;
    case "hashmap":
      return <HashMapCard elPrefix={name} v={v as DictV} color={color} />;
    case "set":
      return <SetCard elPrefix={name} v={v as SetV} color={color} />;
    case "tree":
      return <TreeCard v={v as NodeV} color={color} />;
    case "linkedlist":
    case "graph":
    case "node":
      return <NodeCard v={v as NodeV} color={color} />;
    default:
      return null;
  }
}

export function Canvas({
  step,
  prev,
  overrides = {},
  onOverride,
  blurred,
  onReveal,
}: {
  step?: Step;
  prev?: Step;
  overrides?: Record<string, DSKind>;
  onOverride?: (name: string, kind: DSKind) => void;
  blurred?: boolean;
  onReveal?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!step) {
    return (
      <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
        <div>
          <p className="text-base font-medium text-foreground/80">Nothing running yet</p>
          <p className="mt-1">
            Press <kbd className="rounded bg-muted px-1.5 py-0.5">Run</kbd> to trace your solution.
          </p>
        </div>
      </div>
    );
  }

  const changed = (n: string) =>
    !prev || JSON.stringify(prev.vars[n]) !== JSON.stringify(step.vars[n]);

  const entries = Object.entries(step.vars);

  const pointers: Pointer[] = entries
    .filter(([n, v]) => POINTER_NAMES.has(n) && isIntScalar(v))
    .map(([n, v]) => ({ name: n, index: (v as { value: number }).value }));

  const cards: CardSpec[] = [];
  const scalars: [string, SerializedValue][] = [];

  for (const [name, v] of entries) {
    const base = classify(name, v);
    if (isStructure(base)) {
      cards.push({ name, kind: overrides[name] ?? base, value: v });
    } else if (isLongString(v)) {
      cards.push({ name, kind: overrides[name] ?? "array", value: stringToArray(v) });
    } else {
      scalars.push([name, v]);
    }
  }

  const arrows = computeArrows(prev, cards, pointers, scalars);

  return (
    <div ref={containerRef} className="relative flex h-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-auto p-1">
        <div
          className={cn(
            "flex flex-wrap content-start gap-4 transition-all",
            blurred && "pointer-events-none select-none blur-md"
          )}
        >
          {step.stack && step.stack.length > 1 && <CallStack stack={step.stack} />}
          <AnimatePresence mode="popLayout">
            {cards.map(({ name, kind, value }) => {
              const color = DS_META[kind].color;
              const ptrs: Pointer[] =
                kind === "array"
                  ? pointers.filter((p) => p.index >= 0 && p.index < (value as ArrayV).data.length)
                  : [];
              return (
                <StructCard
                  key={name}
                  name={name}
                  kind={kind}
                  changed={changed(name)}
                  onOverride={(k) => onOverride?.(name, k)}
                >
                  {renderInner(name, kind, value, color, ptrs, prev?.vars[name])}
                </StructCard>
              );
            })}
          </AnimatePresence>
        </div>

        {blurred && (
          <div className="absolute inset-0 grid place-items-center">
            <button
              onClick={onReveal}
              className="flex items-center gap-2 rounded-xl border border-[var(--ds-stack)] bg-card/80 px-4 py-2.5 text-sm font-medium backdrop-blur transition-transform hover:scale-105"
            >
              <Eye className="size-4 text-[var(--ds-stack)]" />
              Predict what changes — then reveal{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Space</kbd>
            </button>
          </div>
        )}
      </div>

      {scalars.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            locals
          </span>
          {scalars.map(([name, v]) => {
            const ptr = POINTER_NAMES.has(name) && isIntScalar(v);
            const color = ptr ? "var(--ds-array)" : "var(--ds-scalar)";
            return (
              <motion.span
                layout
                key={name}
                data-elid={localId(name)}
                animate={{ borderColor: changed(name) ? color : "var(--border)" }}
                className="flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-xs"
              >
                <span className="text-muted-foreground">{name}</span>
                <span className="text-foreground">{valueLabel(v)}</span>
              </motion.span>
            );
          })}
        </div>
      )}

      {!blurred && <ArrowLayer containerRef={containerRef} specs={arrows} />}
    </div>
  );
}
