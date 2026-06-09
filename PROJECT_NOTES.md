# AlgoScope — Build Notes & Decisions

A step-debugger that **visualizes how data flows through the data structures a DSA solution
uses**. Paste a Python LeetCode solution + input, press **Run**, and step through (**Before / Next**)
an animated simulation on a black canvas — one differently-shaped card per data-structure instance,
with **curved arrows** showing exactly where each element moves next.

- **Live:** https://algoscope-beta.vercel.app
- **Location:** `~/Documents/AI-Project/algoscope`
- **Run:** `npm install && npm run dev`

## Why it works the way it does

The reliable way to "replay how data moves" is to **execute + trace**, not statically parse code.

- **Engine: Pyodide (Python in the browser).** The pasted solution runs 100% client-side and is
  traced **line-by-line** via `sys.settrace`. No backend → deploys as a static site and scales to
  unlimited concurrent users (each browser is isolated). Pyodide is loaded from the **jsdelivr CDN**
  (v0.28.3), not bundled, to avoid Vite/WASM friction and keep our bundle tiny.
- **Auto-detect data structures, with a per-card override.** Real LeetCode code is pasted unchanged;
  we infer the structure from type + usage (`list`→array/stack/queue/heap, `dict`→hash map,
  `node.next`→linked list, `left/right`→tree, `heapq`→heap, list-of-lists→grid/DP). A dropdown on each
  card fixes any wrong guess.

## Architecture

1. **Tracer** (`src/lib/tracer.py`, runs inside Pyodide): finds the `Solution` method (or top-level
   function), evaluates the input cell to get args, installs `sys.settrace`, and on every line/call/
   return serializes all locals + the **call stack** (for recursion). A serializer handles
   list/tuple/dict/set/deque and custom node objects (stable ids + cycle-breaking refs); depth/size/
   step caps with a "truncated" flag. `run_result` is a fast no-trace path for the test panel.
2. **Trace model** (`src/lib/trace.ts`): `Step { line, func, depth, vars, stack, ret }` with a tagged
   `SerializedValue` union.
3. **Classifier** (`src/lib/classify.ts`) + **diff/arrow pass** (`src/lib/arrows.ts`): inserts draw an
   arrow from a source array cell → the new element; removals draw `structure → local` (pop) arrows.
4. **Renderer** (`src/components/`): one card per kind (`Cards.tsx`, `TreeView.tsx`, `CallStack.tsx`),
   Framer-Motion layout animations, and an **SVG `ArrowLayer`** that re-measures every frame
   (`perfect-arrows`) so curved arrows stay glued to moving cells.
5. **App** (`src/App.tsx`): editor (CodeMirror) + input, Run/◀▶/scrubber/autoplay, executing-line
   sync, narration, pattern chips, complexity meter, predict mode, save library, test panel.

## Tech stack

**Vite + React + TS**, **Tailwind v4 + shadcn/ui** (black theme), **Framer Motion**,
**perfect-arrows**, **CodeMirror 6**, **Pyodide** (CDN). Deploy: **Vercel** (static, framework=vite).

## Features (all shipped)

- **Structures:** array (+ sliding pointer badges), stack, queue/deque, hash map, set, linked list,
  binary tree, heap (binary-heap tree), 2-D grid / DP table (write-highlighted), dict-graphs.
- **Flow arrows:** insert (`cell → element`) and pop/remove (`structure → local`), curved + animated.
- **Recursion:** call-stack tower that grows/shrinks; depth + per-frame line.
- **Learning aids:** step narration, pattern detector (two-pointers/BFS/DFS/heap/DP/stack/hash),
  complexity meter (ops + depth + peak sizes), **predict-the-next-step** mode, **test-case panel**
  (multi-input, expected vs actual, pass/fail, "view" to visualize), **save library** (localStorage),
  per-card **type override**, 9 seeded examples.

## Storage / scaling

No database. Saved solutions live in the browser's **localStorage** (KB each, instant, ~5–10 MB cap →
hundreds of saves). Everything computes in-browser, so there's no server to bottleneck — concurrency
is effectively unlimited; the only ceiling is Vercel's CDN bandwidth quota. A DB (e.g. Supabase) would
only be needed for cross-device sync / sharing / a public library — not for performance.

## Deploy

```bash
npm run build                 # tsc + vite build → dist/
vercel deploy --prod --yes --scope <team> --token <token>
```
Project settings: framework **vite**, deployment protection **off** (so it's public).

## Possible next steps

- Push to a GitHub repo (currently local git only) for the standard Vercel git flow.
- More structures (union-find, trie, segment tree); pop arrows for heap sift; DP dependency arrows.
- Optional Supabase backend for shareable replay links / a public solution library.
