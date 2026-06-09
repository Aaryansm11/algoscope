# AlgoScope

**Watch your DSA solutions run.** Paste a Python LeetCode solution + input, press Run, and step
through a visual simulation of how data moves through every data structure it uses — array, stack,
queue, hash map, set, linked list, tree, heap, DP grid — with curved flow arrows and a call-stack
view for recursion.

> **Live:** https://algoscope-beta.vercel.app · Full notes: [`PROJECT_NOTES.md`](./PROJECT_NOTES.md)

## How it works

Solutions run **100% in your browser** via **Pyodide** and are traced line-by-line with
`sys.settrace`; the UI replays that trace. No backend — so it deploys as a static site and scales to
unlimited concurrent users.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite build → dist/
```

## Features

Auto-detected structure cards (with a per-card type override) · sliding pointer badges · curved
**insert / pop** arrows · **recursion call-stack** · step **narration** · **pattern detector** ·
**complexity meter** · **predict-the-next-step** mode · **test-case panel** · **save library**
(localStorage) · 9 examples · Run / ◀ ▶ / scrubber / autoplay / ←→ keys / executing-line sync.

## Stack

Vite · React · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion · perfect-arrows · CodeMirror 6 ·
Pyodide (CDN). Deploys to Vercel as a static site.
