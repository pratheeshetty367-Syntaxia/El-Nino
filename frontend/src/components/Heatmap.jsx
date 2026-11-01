import { fmt } from "../lib/constants.js";
 
const STOPS = [
  [232, 246, 248],
  [47, 155, 196],
  [4, 41, 58],
];
 
/** Sequential ocean colour scale for t in 0..1. */
function scale(t) {
  const x = Math.min(1, Math.max(0, t)) * 2;
  const i = x >= 1 ? 1 : 0;
  const f = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
}
 
/** Predictor x lead-time heatmap. Colour = share of that lead time's total mean |SHAP|. */
export default function Heatmap({ rows, leads }) {
  const totals = Object.fromEntries(leads.map((l) => [l, rows.reduce((sum, r) => sum + r.values[l], 0)]));
  return (
    <>
      <div className="table-wrap">
        <table className="heatmap">
          <caption className="sr-only">Mean absolute SHAP value of each predictor at each lead time, shaded by share of the total</caption>
          <thead>
            <tr>
              <th scope="col">Predictor</th>
              {leads.map((l) => (
                <th key={l} scope="col">{l} months</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.name}</th>
                {leads.map((l) => {
                  const share = r.values[l] / totals[l];
                  const top = rows.every((o) => o.values[l] <= r.values[l]);
                  return (
                    <td
                      key={l}
                      className={top ? "heat-cell heat-top" : "heat-cell"}
                      style={{ background: scale(share), color: share > 0.45 ? "#fff" : "#04293a" }}
                    >
                      <strong>{fmt(r.values[l])}</strong>
                      <span>{(share * 100).toFixed(0)}% of total</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend-scale">
        <span>Low share</span>
        <i aria-hidden="true" />
        <span>High share · gold outline = dominant predictor</span>
      </div>
    </>
  );
}