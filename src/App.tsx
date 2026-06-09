import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Lightbulb,
  ListChecks,
  Loader2,
  Pause,
  Play,
  Save,
  SkipBack,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/CodeEditor";
import { Canvas } from "@/components/Canvas";
import { TestPanel } from "@/components/TestPanel";
import { runTrace } from "@/lib/runner";
import type { TraceResult } from "@/lib/trace";
import { valueLabel } from "@/lib/trace";
import type { DSKind } from "@/lib/classify";
import { SAMPLES } from "@/lib/samples";
import { narrate } from "@/lib/narrate";
import { detectPatterns } from "@/lib/patterns";
import { computeStats } from "@/lib/stats";
import { loadSaved, persistSaved, type SavedItem } from "@/lib/storage";

export default function App() {
  const [code, setCode] = useState(SAMPLES[0].code);
  const [input, setInput] = useState(SAMPLES[0].input);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, DSKind>>({});
  const [predict, setPredict] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [saved, setSaved] = useState<SavedItem[]>(() => loadSaved());
  const [showTests, setShowTests] = useState(false);

  const steps = trace?.steps ?? [];
  const total = steps.length;
  const step = steps[index];
  const prev = index > 0 ? steps[index - 1] : undefined;

  const run = useCallback(async (srcArg?: string, inpArg?: string) => {
    const src = srcArg ?? code;
    const inp = inpArg ?? input;
    setBusy(true);
    setPlaying(false);
    setTrace(null);
    setOverrides({});
    try {
      const res = await runTrace(src, inp, setStatus);
      setTrace(res);
      setIndex(0);
      setRevealed(true);
      setStatus(res.error ? "Error" : `${res.steps.length} steps`);
    } catch (e) {
      setStatus("Failed to run: " + String(e));
    } finally {
      setBusy(false);
    }
  }, [code, input]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total]);
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // hide the change when stepping in predict mode
  useEffect(() => {
    if (predict) setRevealed(false);
  }, [index, predict]);

  // autoplay
  useEffect(() => {
    if (!playing) return;
    if (index >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIndex((i) => Math.min(i + 1, total - 1)), 650);
    return () => clearTimeout(t);
  }, [playing, index, total]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
        return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === " " && predict && !revealed) {
        e.preventDefault();
        setRevealed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, predict, revealed]);

  const loadSnippet = (s: { code: string; input: string }) => {
    setCode(s.code);
    setInput(s.input);
    setTrace(null);
    setIndex(0);
    setStatus("");
    setOverrides({});
  };

  const onSelect = (val: string) => {
    if (val.startsWith("s:")) loadSnippet(SAMPLES[Number(val.slice(2))]);
    else if (val.startsWith("v:")) loadSnippet(saved[Number(val.slice(2))]);
  };

  const saveCurrent = () => {
    const name = window.prompt("Save this solution as:");
    if (!name) return;
    const items = [...saved.filter((s) => s.name !== name), { name, code, input }];
    setSaved(items);
    persistSaved(items);
  };

  const patterns = useMemo(
    () => (trace && !trace.error ? detectPatterns(trace) : []),
    [trace]
  );
  const stats = useMemo(
    () => (trace && !trace.error ? computeStats(trace) : null),
    [trace]
  );
  const narration = useMemo(() => (step ? narrate(prev, step) : ""), [step, prev]);

  const resultLabel =
    trace && !trace.error && !trace.runtimeError && trace.result
      ? valueLabel(trace.result)
      : null;

  const blurred = predict && !revealed && total > 0;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <Sparkles className="size-4 text-[var(--ds-stack)]" />
        <span className="font-semibold tracking-tight">
          Algo<span className="text-gradient">Scope</span>
        </span>
        <span className="hidden text-xs text-muted-foreground md:inline">
          watch your DSA solutions run
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            className="max-w-52 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
            onChange={(e) => onSelect(e.target.value)}
            defaultValue="s:0"
          >
            <optgroup label="Examples">
              {SAMPLES.map((s, i) => (
                <option key={s.name} value={`s:${i}`}>
                  {s.name}
                </option>
              ))}
            </optgroup>
            {saved.length > 0 && (
              <optgroup label="Saved">
                {saved.map((s, i) => (
                  <option key={s.name} value={`v:${i}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <Button variant="outline" size="sm" onClick={saveCurrent} className="gap-1.5">
            <Save className="size-4" /> Save
          </Button>
          <Button size="sm" onClick={() => run()} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* left: editor + input */}
        <div className="flex w-[42%] min-w-[360px] flex-col border-r border-border">
          <div className="min-h-0 flex-1 overflow-hidden">
            <CodeEditor value={code} onChange={setCode} execLine={step?.line ?? null} readOnly={busy} />
          </div>
          <div className="border-t border-border p-2">
            <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Input (Python — assign each parameter)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              className="h-20 w-full resize-none rounded-lg border border-border bg-card p-2 font-mono text-xs outline-none focus:border-[var(--ds-stack)]"
            />
          </div>
        </div>

        {/* right: controls + canvas */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* control bar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Button variant="outline" size="icon" onClick={() => setIndex(0)} disabled={!total}>
              <SkipBack className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={back} disabled={index <= 0}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="icon" onClick={() => setPlaying((p) => !p)} disabled={!total || index >= total - 1}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={next} disabled={!total || index >= total - 1}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIndex(total - 1)} disabled={!total}>
              <SkipForward className="size-4" />
            </Button>

            <input
              type="range"
              min={0}
              max={Math.max(0, total - 1)}
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
              disabled={!total}
              className="mx-2 flex-1 accent-[var(--ds-stack)]"
            />

            <Button
              variant={predict ? "default" : "outline"}
              size="sm"
              onClick={() => setPredict((p) => !p)}
              title="Predict-the-next-step mode"
              className="gap-1.5"
            >
              <Eye className="size-4" /> Predict
            </Button>
            <Button
              variant={showTests ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTests((t) => !t)}
              title="Run multiple test cases"
              className="gap-1.5"
            >
              <ListChecks className="size-4" /> Tests
            </Button>

            <span className="min-w-16 text-right font-mono text-xs text-muted-foreground">
              {total ? `${index + 1} / ${total}` : status || "—"}
            </span>
          </div>

          {/* status / narration line */}
          <div className="flex min-h-8 items-center gap-2 px-4 py-1.5 text-xs">
            {busy && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> {status}
              </span>
            )}
            {(trace?.error || trace?.runtimeError) && (
              <span className="rounded bg-[var(--ds-linkedlist)]/15 px-2 py-0.5 font-mono text-[var(--ds-linkedlist)]">
                {trace.error || trace.runtimeError}
              </span>
            )}
            {step && !blurred && (
              <span className="truncate font-mono text-foreground/80">{narration}</span>
            )}
            {step && (
              <span className="shrink-0 font-mono text-muted-foreground">· line {step.line}</span>
            )}
            {stats && (
              <span className="ml-auto shrink-0 font-mono text-muted-foreground">
                {stats.ops} ops{stats.maxDepth > 1 ? ` · depth ${stats.maxDepth}` : ""}
              </span>
            )}
            {resultLabel !== null && (
              <span className="shrink-0 rounded bg-[var(--ds-hashmap)]/15 px-2 py-0.5 font-mono text-[var(--ds-hashmap)]">
                returns {resultLabel}
              </span>
            )}
            {trace?.truncated && (
              <span className="shrink-0 rounded bg-[var(--ds-set)]/15 px-2 py-0.5 text-[var(--ds-set)]">
                truncated
              </span>
            )}
          </div>

          {/* pattern chips */}
          {patterns.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-4 pb-1.5">
              <Lightbulb className="size-3.5 text-[var(--ds-set)]" />
              {patterns.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-border bg-card px-2 py-0.5 text-[0.65rem] text-muted-foreground"
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {/* canvas */}
          <div className="min-h-0 flex-1 overflow-hidden bg-dots p-4">
            <Canvas
              step={step}
              prev={prev}
              overrides={overrides}
              onOverride={(name, kind) => setOverrides((o) => ({ ...o, [name]: kind }))}
              blurred={blurred}
              onReveal={() => setRevealed(true)}
            />
          </div>

          {showTests && (
            <TestPanel
              code={code}
              initialInput={input}
              onClose={() => setShowTests(false)}
              onView={(caseInput) => {
                setInput(caseInput);
                setShowTests(false);
                run(code, caseInput);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
