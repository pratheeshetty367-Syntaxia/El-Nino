import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorBox, Loading, Note, PageHeader } from "../components/States.jsx";
import useFetch from "../hooks/useFetch.js";
import { LEADS, fmt } from "../lib/constants.js";
 
export default function Models() {
  const published = useFetch("/api/research/published");
  const computed = useFetch("/api/research/computed");
  const [lead, setLead] = useState(3);
  const [source, setSource] = useState("published");
 
  if (published.loading || computed.loading) return <Loading />;
  if (published.error) return <ErrorBox error={published.error} onRetry={published.reload} />;
 
  const hasComputed = Boolean(computed.data?.baselines);
  const rows = (source === "computed" && hasComputed ? computed.data.baselines.leads : published.data.baselines)[String(lead)];
  const perf = published.data.performance.find((p) => p.lead_time === lead);
 
  return (
    <>
      <PageHeader
        title="Model comparison"
        subtitle="XGBoost compared with Random Forest, Logistic Regression, SVM, LightGBM and CatBoost under identical LOOCV."
        actions={
          <div className="segmented" role="radiogroup" aria-label="Result source">
            <label className={source === "published" ? "seg active" : "seg"}>
              <input type="radio" name="msrc" checked={source === "published"} onChange={() => setSource("published")} />
              Published (paper)
            </label>
            <label className={source === "computed" ? "seg active" : "seg"}>
              <input type="radio" name="msrc" disabled={!hasComputed} checked={source === "computed"} onChange={() => setSource("computed")} />
              Recomputed here
            </label>
          </div>
        }
      />
      <div className="segmented" role="radiogroup" aria-label="Lead time">
        {LEADS.map((l) => (
          <label key={l} className={lead === l ? "seg active" : "seg"}>
            <input type="radio" name="mlead" checked={lead === l} onChange={() => setLead(l)} />
            {l} months
          </label>
        ))}
      </div>
 
      <section className="card">
        <h2>
          {lead}-month lead time — {source === "published" ? "Tables IV and V" : "recomputed"}
        </h2>
        <div role="img" aria-label="Grouped bar chart of accuracy, recall and precision per model" style={{ height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" interval={0} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 1]} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="accuracy" name="Accuracy" fill="#0072B2" />
              <Bar dataKey="recall" name="Recall (Extreme)" fill="#009E73" />
              <Bar dataKey="precision" name="Precision (Extreme)" fill="#D55E00" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col" className="num">Acc.</th>
                <th scope="col" className="num">Rec.</th>
                <th scope="col" className="num">Prec.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model}>
                  <th scope="row">{r.model}</th>
                  <td className="num">{fmt(r.accuracy)}</td>
                  <td className="num">{fmt(r.recall)}</td>
                  <td className="num">{fmt(r.precision)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>
          Acc. = accuracy; Rec. and Prec. refer to the Extreme El Niño class. {published.data.notes.baselines}
        </Note>
      </section>
 
      <section className="card">
        <h2>Table I — XGBoost LOOCV performance (primary model)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Lead time</th>
                <th scope="col" className="num">Acc.</th>
                <th scope="col" className="num">Recall</th>
                <th scope="col" className="num">Precision</th>
                <th scope="col">Extreme events detected</th>
              </tr>
            </thead>
            <tbody>
              {published.data.performance.map((p) => (
                <tr key={p.lead_time} className={p.lead_time === perf.lead_time ? "row-active" : ""}>
                  <th scope="row">{p.lead_time} M</th>
                  <td className="num">{p.accuracy.toFixed(1)}%</td>
                  <td className="num">{p.recall.toFixed(2)}</td>
                  <td className="num">{p.precision.toFixed(2)}</td>
                  <td>{p.extreme_detected.length ? p.extreme_detected.join(", ") : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>{published.data.notes.performance}</Note>
      </section>
    </>
  );
}
