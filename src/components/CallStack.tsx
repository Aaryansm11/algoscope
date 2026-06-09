import { AnimatePresence, motion } from "framer-motion";
import type { Frame } from "@/lib/trace";

const C = "var(--ds-stack)";

/** Recursion / call-stack tower — top frame (current) on top, grows & shrinks. */
export function CallStack({ stack }: { stack: Frame[] }) {
  const frames = [...stack].reverse(); // current frame first
  return (
    <div className="relative h-fit rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
      <div
        className="pointer-events-none absolute -top-px left-6 right-6 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${C}, transparent)` }}
      />
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: C }} />
        <span className="font-mono text-sm font-semibold">call stack</span>
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider"
          style={{ color: C, background: `color-mix(in oklch, ${C} 14%, transparent)` }}
        >
          depth {stack.length}
        </span>
      </div>
      <div className="flex w-48 flex-col gap-1">
        <AnimatePresence initial={false}>
          {frames.map((f, idx) => {
            const realDepth = stack.length - idx; // 1-based from bottom
            return (
              <motion.div
                key={realDepth + ":" + f.func}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs"
                style={{
                  borderColor: idx === 0 ? C : "var(--border)",
                  background:
                    idx === 0
                      ? `color-mix(in oklch, ${C} 18%, transparent)`
                      : "oklch(1 0 0 / 4%)",
                  color: idx === 0 ? "white" : undefined,
                }}
              >
                <span className="text-muted-foreground">{realDepth}</span>
                <span className="truncate">{f.func}()</span>
                <span className="ml-auto text-muted-foreground">L{f.line}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
