// Grafici a serie singola: niente legenda (il titolo dice già cosa mostra),
// griglia in secondo piano, ultimo punto etichettato.

export function LineChart({ points, unit = "", color = "var(--forza)", label }) {
  if (!points || points.length < 2) {
    return <div className="emptyish">Servono almeno due sessioni per vedere una tendenza.</div>;
  }
  const W = 300, H = 130, PL = 8, PR = 46, PT = 16, PB = 22;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = max - min || 1;
  const x = (i) => PL + (i * (W - PL - PR)) / (points.length - 1);
  const y = (v) => PT + (1 - (v - min) / span) * (H - PT - PB);

  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const lastP = points[points.length - 1];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
         aria-label={`${label || "Andamento"}: da ${points[0].y} a ${lastP.y} ${unit}`}>
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--hairline)" strokeWidth="1" />
      <line x1={PL} y1={PT} x2={W - PR} y2={PT} stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2 4" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(lastP.y)} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
      <text x={W - PR + 6} y={y(lastP.y) + 4} fontFamily="ui-monospace, monospace" fontSize="12"
            fontWeight="700" fill="var(--ink)">{fmtNum(lastP.y)}{unit}</text>
      <text x={PL} y={H - 6} fontFamily="ui-monospace, monospace" fontSize="9" fill="var(--muted)">{points[0].label}</text>
      <text x={W - PR} y={H - 6} textAnchor="end" fontFamily="ui-monospace, monospace" fontSize="9"
            fill="var(--muted)">{lastP.label}</text>
    </svg>
  );
}

export function BarChart({ bars, unit = "", color = "var(--corsa)", label }) {
  if (!bars || bars.length === 0) return <div className="emptyish">Nessun dato ancora.</div>;
  const max = Math.max(...bars.map((b) => b.y), 1);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${bars.length}, 1fr)`, gap: 4, alignItems: "end", height: 110 }}
           role="img" aria-label={`${label || "Volume"} per settimana`}>
        {bars.map((b, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }} title={`${b.label}: ${b.y}${unit}`}>
            <span className="num" style={{ fontSize: 10, fontWeight: 700, textAlign: "center", marginBottom: 3 }}>
              {b.y ? Math.round(b.y) : ""}
            </span>
            <i style={{ display: "block", height: `${(b.y / max) * 100}%`, minHeight: b.y ? 3 : 0,
                        background: b.muted ? "var(--hairline-strong)" : color, borderRadius: "4px 4px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${bars.length}, 1fr)`, gap: 4,
                    borderTop: "1px solid var(--hairline)", marginTop: 5, paddingTop: 5 }}>
        {bars.map((b, i) => (
          <span key={i} className="num" style={{ fontSize: 9, color: "var(--muted)", textAlign: "center" }}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}

const fmtNum = (n) => (Number.isInteger(n) ? n : Math.round(n * 10) / 10).toString().replace(".", ",");
