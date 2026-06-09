import { useEffect, useRef, useState } from "react";
import { getBoxToBoxArrow } from "perfect-arrows";
import type { ArrowSpec } from "@/lib/arrows";

interface PathData {
  key: string;
  d: string;
  ex: number;
  ey: number;
  ae: number;
  color: string;
}

function escapeId(s: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return s.replace(/["\\]/g, "\\$&");
}

/** Curved SVG arrows that stay glued to their source/target cells (re-measured
 *  every frame so they follow Framer-Motion layout animations). */
export function ArrowLayer({
  containerRef,
  specs,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  specs: ArrowSpec[];
}) {
  const [paths, setPaths] = useState<PathData[]>([]);
  const specsRef = useRef(specs);
  specsRef.current = specs;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const cont = containerRef.current;
      if (cont) {
        const cr = cont.getBoundingClientRect();
        const out: PathData[] = [];
        for (const s of specsRef.current) {
          const a = cont.querySelector<HTMLElement>(`[data-elid="${escapeId(s.from)}"]`);
          const b = cont.querySelector<HTMLElement>(`[data-elid="${escapeId(s.to)}"]`);
          if (!a || !b) continue;
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          const [sx, sy, cx, cy, ex, ey, ae] = getBoxToBoxArrow(
            ar.left - cr.left,
            ar.top - cr.top,
            ar.width,
            ar.height,
            br.left - cr.left,
            br.top - cr.top,
            br.width,
            br.height,
            { bow: 0.2, stretch: 0.4, stretchMin: 30, stretchMax: 360, padStart: 4, padEnd: 12 }
          );
          out.push({
            key: `${s.from}>${s.to}`,
            d: `M ${sx},${sy} Q ${cx},${cy} ${ex},${ey}`,
            ex,
            ey,
            ae: ae * (180 / Math.PI),
            color: s.color,
          });
        }
        setPaths(out);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [containerRef]);

  return (
    <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {paths.map((p) => (
        <g key={p.key} style={{ filter: `drop-shadow(0 0 4px ${p.color})` }}>
          <path
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.92}
          />
          <polygon
            points="0,-5 11,0 0,5"
            fill={p.color}
            transform={`translate(${p.ex},${p.ey}) rotate(${p.ae})`}
          />
        </g>
      ))}
    </svg>
  );
}
