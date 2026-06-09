import { useState } from "react";
import { Eye, Loader2, Play, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runResult } from "@/lib/runner";
import { valueLabel } from "@/lib/trace";

type Status = "pass" | "fail" | "na" | "err";
interface Case {
  input: string;
  expected: string;
  result?: string;
  status?: Status;
}

function ResultBadge({ status, result }: { status: Status; result?: string }) {
  const map: Record<Status, { c: string; t: string }> = {
    pass: { c: "var(--ds-hashmap)", t: `✓ ${result}` },
    fail: { c: "var(--ds-linkedlist)", t: `✗ got ${result}` },
    na: { c: "var(--ds-array)", t: result ?? "" },
    err: { c: "var(--ds-set)", t: "error" },
  };
  const m = map[status];
  return (
    <span
      className="truncate rounded px-1.5 py-0.5 font-mono text-[0.65rem]"
      style={{ color: m.c, background: `color-mix(in oklch, ${m.c} 14%, transparent)` }}
    >
      {m.t}
    </span>
  );
}

export function TestPanel({
  code,
  initialInput,
  onView,
  onClose,
}: {
  code: string;
  initialInput: string;
  onView: (input: string) => void;
  onClose: () => void;
}) {
  const [cases, setCases] = useState<Case[]>([{ input: initialInput, expected: "" }]);
  const [running, setRunning] = useState(false);

  const update = (i: number, patch: Partial<Case>) =>
    setCases((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const runAll = async () => {
    setRunning(true);
    const out: Case[] = [];
    for (const c of cases) {
      try {
        const r = await runResult(code, c.input);
        if (r.error || r.runtimeError) {
          out.push({ ...c, result: r.error || r.runtimeError, status: "err" });
        } else {
          const label = r.result ? valueLabel(r.result) : "None";
          const exp = c.expected.trim();
          out.push({
            ...c,
            result: label,
            status: exp ? (label === exp ? "pass" : "fail") : "na",
          });
        }
      } catch (e) {
        out.push({ ...c, result: String(e), status: "err" });
      }
    }
    setCases(out);
    setRunning(false);
  };

  const passed = cases.filter((c) => c.status === "pass").length;
  const graded = cases.filter((c) => c.status === "pass" || c.status === "fail").length;

  return (
    <div className="absolute right-0 top-0 z-30 flex h-full w-96 flex-col border-l border-border bg-card/95 backdrop-blur">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="font-semibold">Test cases</span>
        {graded > 0 && (
          <span className="font-mono text-xs text-muted-foreground">
            {passed}/{graded} passing
          </span>
        )}
        <Button size="sm" onClick={runAll} disabled={running} className="ml-auto gap-1.5">
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Run all
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-3">
        {cases.map((c, i) => (
          <div key={i} className="rounded-xl border border-border p-2.5">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Case {i + 1}</span>
              {c.status && <ResultBadge status={c.status} result={c.result} />}
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-6"
                title="Visualize this case"
                onClick={() => onView(c.input)}
              >
                <Eye className="size-3.5" />
              </Button>
              {cases.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setCases((cs) => cs.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            <textarea
              value={c.input}
              onChange={(e) => update(i, { input: e.target.value, status: undefined })}
              placeholder={"nums = [2, 7, 11, 15]\ntarget = 9"}
              spellCheck={false}
              className="h-16 w-full resize-none rounded-lg border border-border bg-background p-2 font-mono text-xs outline-none focus:border-[var(--ds-stack)]"
            />
            <div className="mt-1.5 flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">expected</span>
              <input
                value={c.expected}
                onChange={(e) => update(i, { expected: e.target.value, status: undefined })}
                placeholder="(optional, e.g. [0, 1])"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:border-[var(--ds-stack)]"
              />
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCases((cs) => [...cs, { input: "", expected: "" }])}
          className="w-full gap-1.5"
        >
          <Plus className="size-4" /> Add case
        </Button>
      </div>
    </div>
  );
}
