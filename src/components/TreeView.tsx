export interface TNode {
  id: string;
  label: string;
  active?: boolean;
  left?: TNode | null;
  right?: TNode | null;
}

const X = 50;
const Y = 58;
const R = 17;

/** Binary tree / heap renderer: in-order x, depth y, SVG edges + node circles. */
export function TreeView({ root, color }: { root: TNode | null; color: string }) {
  if (!root) {
    return <span className="font-mono text-xs text-muted-foreground">None</span>;
  }

  let counter = 0;
  let maxDepth = 0;
  const pos = new Map<TNode, { x: number; y: number }>();
  const order: TNode[] = [];

  const assign = (node: TNode | null | undefined, depth: number) => {
    if (!node) return;
    assign(node.left, depth + 1);
    pos.set(node, { x: counter++, y: depth });
    order.push(node);
    maxDepth = Math.max(maxDepth, depth);
    assign(node.right, depth + 1);
  };
  assign(root, 0);

  const width = Math.max(1, counter) * X;
  const height = (maxDepth + 1) * Y;
  const cx = (n: TNode) => pos.get(n)!.x * X + X / 2;
  const cy = (n: TNode) => pos.get(n)!.y * Y + Y / 2;

  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const n of order) {
    for (const c of [n.left, n.right]) {
      if (c && pos.has(c)) edges.push({ x1: cx(n), y1: cy(n), x2: cx(c), y2: cy(c) });
    }
  }

  return (
    <div className="relative" style={{ width, height }}>
      <svg className="absolute inset-0" width={width} height={height}>
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="var(--border)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      {order.map((n) => (
        <div
          key={n.id}
          className="absolute grid place-items-center rounded-full border font-mono text-sm transition-colors"
          style={{
            left: cx(n) - R,
            top: cy(n) - R,
            width: R * 2,
            height: R * 2,
            borderColor: n.active ? color : "var(--border)",
            background: n.active
              ? `color-mix(in oklch, ${color} 24%, transparent)`
              : "oklch(1 0 0 / 5%)",
            color: n.active ? "white" : undefined,
          }}
        >
          {n.label}
        </div>
      ))}
    </div>
  );
}
