// Types mirroring the JSON emitted by tracer.py

export type Scalar = string | number | boolean | null;

export type SerializedValue =
  | { kind: "scalar"; value: Scalar; str?: boolean }
  | { kind: "array"; id: number; data: SerializedValue[]; tuple?: boolean }
  | { kind: "deque"; id: number; data: SerializedValue[] }
  | { kind: "dict"; id: number; data: { k: SerializedValue; v: SerializedValue }[] }
  | { kind: "set"; id: number; data: SerializedValue[]; frozen?: boolean }
  | { kind: "node"; id: number; cls: string; attrs: Record<string, SerializedValue> }
  | { kind: "ref"; id: number };

export interface Frame {
  func: string;
  line: number;
}

export interface Step {
  line: number;
  func: string;
  depth: number;
  event: "line" | "return";
  vars: Record<string, SerializedValue>;
  ret?: SerializedValue;
  stack?: Frame[];
}

export interface TraceResult {
  steps: Step[];
  truncated: boolean;
  method: string;
  params: string[];
  result?: SerializedValue;
  runtimeError?: string;
  error?: string; // setup/compile error (no steps)
}

/** A scalar rendered to a short string for chips/cells. */
export function valueLabel(v: SerializedValue): string {
  switch (v.kind) {
    case "scalar":
      if (v.value === null) return "None";
      if (v.value === true) return "True";
      if (v.value === false) return "False";
      if (v.str) return JSON.stringify(v.value);
      return String(v.value);
    case "array":
      return `[${v.data.length}]`;
    case "deque":
      return `deque(${v.data.length})`;
    case "dict":
      return `{${v.data.length}}`;
    case "set":
      return `set(${v.data.length})`;
    case "node":
      return v.cls;
    case "ref":
      return "↺";
  }
}
