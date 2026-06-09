import tracerSrc from "./tracer.py?raw";
import type { TraceResult } from "./trace";

const PYODIDE_VERSION = "0.28.3";
const BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pyodide = any;

let pyodidePromise: Promise<Pyodide> | null = null;

/** Lazily load Pyodide from the CDN and define the tracer module once. */
export function loadRuntime(
  onStatus?: (msg: string) => void
): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.("Downloading Python runtime…");
      const mod = await import(/* @vite-ignore */ `${BASE}pyodide.mjs`);
      onStatus?.("Starting Python…");
      const py = await mod.loadPyodide({ indexURL: BASE });
      py.runPython(tracerSrc);
      onStatus?.("Ready");
      return py;
    })();
  }
  return pyodidePromise;
}

export function runtimeReady(): boolean {
  return pyodidePromise !== null;
}

/** Execute + trace a solution. Throws only on internal failures; user
 *  compile/runtime errors come back inside the TraceResult. */
export async function runTrace(
  source: string,
  input: string,
  onStatus?: (msg: string) => void
): Promise<TraceResult> {
  const py = await loadRuntime(onStatus);
  onStatus?.("Running…");
  py.globals.set("__src", source);
  py.globals.set("__inp", input);
  const json: string = py.runPython("run_traced(__src, __inp)");
  return JSON.parse(json) as TraceResult;
}

export interface RunResult {
  result?: import("./trace").SerializedValue;
  error?: string;
  runtimeError?: string;
}

/** Fast no-trace run used by the test-case panel. */
export async function runResult(source: string, input: string): Promise<RunResult> {
  const py = await loadRuntime();
  py.globals.set("__src", source);
  py.globals.set("__inp", input);
  const json: string = py.runPython("run_result(__src, __inp)");
  return JSON.parse(json) as RunResult;
}
