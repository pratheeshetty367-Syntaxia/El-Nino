import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Heatmap from "../components/Heatmap.jsx";
import { EmptyState, ErrorBox, Loading, Note, PageHeader } from "../components/States.jsx";
import useFetch from "../hooks/useFetch.js";
import { LEADS, PREDICTORS, fmt } from "../lib/constants.js";
 
function rankMap(values) {
  const order = Object.entries(values).sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(order.map(([k], i) => [k, i + 1]));
}
 
export default function Importance() {
  const published = useFetch("/api/research/published");
  const computed = useFetch("/api/research/computed");
  const [source, setSource] = useState("published");
 
  const table = useMemo(() => {
    if (source === "published" && published.data) {
      return PREDICTORS.map((p) => {
        const row = published.data.shap_importance.predictors.find((x) => x.key === p.key);
        return { ...p, values: row.values, ranks: row.ranks };
      });
    }
    const training = computed.data?.training;
    if (source === "computed" && training) {
      const ranks = {};
      for (const l of LEADS) ranks[l] = rankMap(Object.fromEntries(PREDICTORS.map((p) => [p.key, training.leads[l].shap_mean_abs[p.key]])));
      return PREDICTORS.map((p) => ({
        ...p,
        values: Object.fromEntries(LEADS.map((l) => [l, training.leads[l].shap_mean_abs[p.key]])),
        ranks: Object.fromEntries(LEADS.map((l) => [l, ranks[l][p.key]])),
      }));
    }
    return null;
  }, [source, published.data, computed.data]);
 
  const chartData = table
    ? LEADS.map((l) => ({ lead: `${l} M`, ...Object.fromEntries(table.map((p) => [p.name, p.values[l]])) }))
    : [];
 
  const hasComputed = Boolean(computed.data?.training);
 
  if (published.loading || computed.loading) return <Loading />;
  if (published.error) return <ErrorBox error={published.error} onRetry={published.reload} />;
 
  return (
    <>
      <PageHeader
        title="Lead-time predictor importance"
        subtitle="Mean absolute SHAP value of each predictor (averaged over seasons and the three output classes)."
        actions={
          <div className="segmented" role="radiogroup" aria-label="Result source">
            <label className={source === "published" ? "seg active" : "seg"}>
              <input type="radio" name="src" checked={source === "published"} onChange={() => setSource("published")} />
              Published (paper)
            </label>
            <label className={source === "computed" ? "seg active" : "seg"}>
              <input
                type="radio"
                name="src"
                checked={source === "computed"}
                disabled={!hasComputed}
                onChange={() => setSource("computed")}
              />
              Recomputed here
            </label>
          </div>
        }
      />
      {!table ? (
        <EmptyState title="No recomputed results">Run `python -m ml.train` or ask an admin to start training.</EmptyState>
      ) : (
        <>
          <section className="card">
            <h2>Importance heatmap</h2>
            <Heatmap rows={table} leads={LEADS} />
          </section>
 
          <section className="card">
            <h2>Importance across lead times</h2>
            <div role="img" aria-label="Line chart of mean absolute SHAP value by predictor and lead time" style={{ height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="lead" label={{ value: "Lead time", position: "insideBottom", offset: -12 }} />
                  <YAxis label={{ value: "Mean |SHAP|", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend verticalAlign="top" />
                  {table.map((p) => (
                    <Line key={p.key} type="monotone" dataKey={p.name} stroke={p.color} strokeWidth={2} dot={{ r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
 
          <section className="card">
            <h2>{source === "published" ? "Table II — SHAP predictor importance" : "Recomputed SHAP importance"}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Predictor</th>
                    {LEADS.map((l) => (
                      <th key={l} scope="col" className="num">{l} M</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.map((p) => (
                    <tr key={p.key}>
                      <th scope="row">{p.name}</th>
                      {LEADS.map((l) => (
                        <td key={l} className={p.ranks[l] === 1 ? "num top" : "num"}>
                          {fmt(p.values[l])} <span className="muted">({p.ranks[l]})</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note>Rank in brackets; the highlighted cell is the dominant predictor at that lead time.</Note>
          </section>
        </>
      )}
    </>
  );
}

